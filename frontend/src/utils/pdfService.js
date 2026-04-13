import jsPDF from 'jspdf';

class PdfService {
  static async generateAdmissionPdf(formData, photoPreview = null, logoBase64 = null) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // ========== WATERMARK ==========
    // const addWatermark = () => {
    //   if (!logoBase64) return;
    //   try {
    //     doc.saveGraphicsState();
    //     const gState = doc.GState({ opacity: 0.28 });
    //     doc.setGState(gState);
    //     const wmSize = 100;
    //     doc.addImage(logoBase64, 'PNG', (pageWidth - wmSize) / 2, (pageHeight - wmSize) / 2, wmSize, wmSize);
    //     doc.restoreGraphicsState();
    //   } catch (e) { console.warn('Watermark failed', e); }
    // };
    // addWatermark();

    const formattedDateTime = this._formatAdmissionDateTime(formData);

    // Outer border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(4, 4, pageWidth - 8, pageHeight - 8);

    const labelColor = [20, 20, 20];
    const valueColor = [0, 0, 0];
    const greyLine   = [210, 210, 210];
    const FS_FIELD   = 10;  // Fields and input data
    const FS_SECTION = 12;  // Section titles
    const FS_DATE    = 8;   // Date placeholder text
    const LCW        = 36;
    const col2X      = pageWidth / 2 + 5;
    const secX       = margin;
    const secW       = pageWidth - margin * 2;
    const ROW_H      = 8;      // Standard row height for most fields
    const ROW_H_TIGHT = 6;     // Tighter row height for Address and Diagnosis
    const SEC_BOX_H  = 9;
    const SEC_GAP    = 3;
    const BLOCK_GAP  = 4;

    // Helper function to get display value (empty string for falsy values except 0)
    const getDisplayValue = (value) => {
      if (value === null || value === undefined || value === '') return '';
      if (typeof value === 'string' && value.trim() === '') return '';
      return value.toString();
    };

    // Helper function to truncate address to 160 characters
    const getTruncatedAddress = (address) => {
      if (!address) return '';
      const addressStr = address.toString();
      if (addressStr.length <= 160) return addressStr;
      return addressStr.substring(0, 157) + '...';
    };

    // ---- helpers ----
    const drawDivider = (y, color = [0, 0, 0], w = 0.6) => {
      doc.setDrawColor(...color); doc.setLineWidth(w);
      doc.line(margin, y, pageWidth - margin, y);
    };

    const drawSectionBox = (title, y) => {
      doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.setFillColor(255, 255, 255);
      doc.roundedRect(secX, y, secW, SEC_BOX_H, 3, 3, 'FD');
      doc.setFontSize(FS_SECTION); doc.setFont('helvetica', 'bold'); doc.setTextColor(...labelColor);
      doc.text(title, pageWidth / 2, y + 6, { align: 'center' });
      return y + SEC_BOX_H + SEC_GAP;
    };

    const drawOwnerRow = (label, value, y, lineEndX) => {
      // Top border
      doc.setDrawColor(...greyLine); doc.setLineWidth(0.3);
      doc.line(margin, y, lineEndX, y);
      
      doc.setFontSize(FS_FIELD); doc.setFont('helvetica', 'bold'); doc.setTextColor(...labelColor);
      doc.text(label, margin, y + 5.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
      const maxW = lineEndX - margin - LCW - 2;
      const displayValue = getDisplayValue(value);
      doc.text(doc.splitTextToSize(displayValue, maxW)[0] || '', margin + LCW, y + 5.5);
      
      // Bottom border
      doc.setDrawColor(...greyLine); doc.setLineWidth(0.3);
      doc.line(margin, y + ROW_H, lineEndX, y + ROW_H);
      
      return y + ROW_H;
    };

    // UPDATED: Address rows with ADDED SPACING to prevent overlap
    const drawAddressRows = (label, value, y, lineEndX, photoBottomY) => {
      const maxW = lineEndX - margin - LCW - 2; // Width available for text beside photo
      // Use truncated address
      const truncatedAddress = getTruncatedAddress(value);
      const displayValue = getDisplayValue(truncatedAddress);
      const addressLines = displayValue ? doc.splitTextToSize(displayValue, maxW) : [''];
      
      // Calculate how many lines fit beside the photo using tighter spacing
      const availableSpaceForLines = photoBottomY - y;
      const maxLinesBesidePhoto = Math.floor(availableSpaceForLines / ROW_H_TIGHT);
      
      let currentY = y;
      let lineEndPosition = lineEndX;
      let lineCount = 0;
      
      // Draw top border
      doc.setDrawColor(...greyLine); doc.setLineWidth(0.3);
      doc.line(margin, currentY, lineEndPosition, currentY);
      
      // Draw label and first line
      doc.setFontSize(FS_FIELD); doc.setFont('helvetica', 'bold'); doc.setTextColor(...labelColor);
      doc.text(label, margin, currentY + 5.5);
      
      if (addressLines.length > 0) {
        doc.setFontSize(FS_FIELD); doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
        doc.text(addressLines[0], margin + LCW, currentY + 5.5);
      }
      
      currentY += ROW_H_TIGHT;
      lineCount = 1;
      
      // Draw remaining lines that fit beside the photo
      for (let i = 1; i < Math.min(addressLines.length, maxLinesBesidePhoto); i++) {
        doc.setFontSize(FS_FIELD); doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
        doc.text(addressLines[i], margin + LCW, currentY + 5.5);
        currentY += ROW_H_TIGHT;
        lineCount++;
      }
      
      // If there are more lines, they go below the photo (full width)
      if (addressLines.length > maxLinesBesidePhoto) {
        // Move to below the photo
        if (currentY < photoBottomY) {
          currentY = photoBottomY;
          lineEndPosition = pageWidth - margin; // Switch to full width
          
          // Add top border at the new position for the first line below photo
          doc.setDrawColor(...greyLine); doc.setLineWidth(0.3);
          doc.line(margin, currentY, lineEndPosition, currentY);
        }
        
        // Draw remaining lines full width with tighter spacing
        for (let i = maxLinesBesidePhoto; i < addressLines.length; i++) {
          doc.setFontSize(FS_FIELD); doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
          doc.text(addressLines[i], margin + LCW, currentY + 5.5);
          currentY += ROW_H_TIGHT;
        }
      }
      
      // Add a small extra space before bottom border to prevent overlap
      currentY += 1;
      
      // Draw bottom border at the final position
      doc.setDrawColor(...greyLine); doc.setLineWidth(0.3);
      doc.line(margin, currentY, lineEndPosition, currentY);
      
      return currentY;
    };

    // UPDATED: Two-column row WITHOUT vertical divider
    const drawTwoColRowNoDivider = (l1, v1, l2, v2, y) => {
      drawDivider(y, greyLine, 0.3);
      doc.setFontSize(FS_FIELD);
      
      // Left column
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...labelColor); 
      doc.text(l1, margin, y + 5.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
      const displayV1 = getDisplayValue(v1);
      doc.text(doc.splitTextToSize(displayV1, col2X - margin - LCW - 2)[0] || '', margin + LCW, y + 5.5);
      
      // Right column
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...labelColor); 
      doc.text(l2, col2X, y + 5.5);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
      const displayV2 = getDisplayValue(v2);
      doc.text(doc.splitTextToSize(displayV2, pageWidth - margin - col2X - LCW - 2)[0] || '', col2X + LCW, y + 5.5);
      
      // Bottom divider only (no vertical line)
      drawDivider(y + ROW_H, greyLine, 0.3);
      return y + ROW_H;
    };

    // UPDATED: Full-width multi-line wrapped row with ADDED SPACING to prevent overlap
    const drawFullRowWrapped = (label, value, y) => {
      const maxW = pageWidth - margin - LCW - margin - 2;
      const displayValue = getDisplayValue(value);
      const lines = displayValue ? doc.splitTextToSize(displayValue, maxW) : [''];
      let cy = y;
      
      // Draw top border
      drawDivider(cy, greyLine, 0.3);
      
      // Draw label and first line
      doc.setFontSize(FS_FIELD);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...labelColor);
      doc.text(label, margin, cy + 5.5);
      
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
      
      if (lines.length > 0) {
        doc.text(lines[0], margin + LCW, cy + 5.5);
      }
      
      cy += ROW_H_TIGHT;
      
      // Draw remaining lines
      for (let i = 1; i < lines.length; i++) {
        doc.setFontSize(FS_FIELD);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...valueColor);
        doc.text(lines[i], margin + LCW, cy + 5.5);
        cy += ROW_H_TIGHT;
      }
      
      // Add a small extra space before bottom border to prevent overlap
      cy += 1;
      
      // Draw bottom border with extra spacing
      drawDivider(cy, greyLine, 0.3);
      
      return cy;
    };

    // =====================================================================
    // RENDER
    // =====================================================================
    // UPDATED: Start y position moved further up (from margin-4 to margin-8)
    let y = margin - 8;

    // ---- HEADER ----
    if (logoBase64) {
      try { 
        // UPDATED: Logo size increased from 22x22 to 26x26
        // Position adjusted to keep within page (y + 2 to add a small top margin)
        doc.addImage(logoBase64, 'PNG', margin, y + 2, 26, 26); 
      }
      catch (e) { /* skip */ }
    }
    
    // UPDATED: Font size 20 for Bezuban Charitable Trust
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
    // "Bezuban Charitable Trust" at the top
    doc.text('Bezuban Charitable Trust', pageWidth / 2, y + 11, { align: 'center' });
    
    // UPDATED: Font size 13 for ANIMAL CASE REPORT
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 139);
    doc.text('ANIMAL CASE REPORT', pageWidth / 2, y + 21, { align: 'center' });

    const tagText = `TAG: ${formData.tagNo || formData.tag_no || ''}`;
    // UPDATED: Font size 13 for TAG
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    const tagTW = doc.getStringUnitWidth(tagText) * 13 / doc.internal.scaleFactor;
    const tagBW = tagTW + 8;
    const tagBX = pageWidth - margin - tagBW;
    doc.setFillColor(255, 255, 0); doc.setDrawColor(200, 200, 0);
    // UPDATED: Tag moved upward to align with "Bezuban Charitable Trust" line
    doc.roundedRect(tagBX, y + 7, tagBW, 7, 2, 2, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.text(tagText, tagBX + 4, y + 12);
    y += 37; // Adjusted to account for taller header (increased from 35 to 37)

    // ---- TITLE - REMOVED from here ----

    // ---- OWNER INFORMATION ----
    y = drawSectionBox('OWNER INFORMATION', y);

    // UPDATED: Even larger photo size (increased from 52x45 to 58x50)
    const photoBoxWidth  = 58;
    const photoBoxHeight = 50;
    const photoBoxX      = pageWidth - margin - photoBoxWidth;
    const photoBoxY      = y;
    const photoBottomY   = photoBoxY + photoBoxHeight;
    const lineEndX       = photoBoxX - 5;

    doc.setDrawColor(130, 130, 130); doc.setLineWidth(0.5);
    doc.rect(photoBoxX, photoBoxY, photoBoxWidth, photoBoxHeight);
    if (photoPreview) {
      try {
        let imgFmt = 'JPEG';
        if (typeof photoPreview === 'string') {
          if (photoPreview.startsWith('data:image/png')) imgFmt = 'PNG';
          else if (photoPreview.startsWith('data:image/webp')) imgFmt = 'WEBP';
          else if (photoPreview.startsWith('data:image/gif')) imgFmt = 'GIF';
        }
        doc.addImage(photoPreview, imgFmt, photoBoxX + 1, photoBoxY + 1, photoBoxWidth - 2, photoBoxHeight - 2);
      }
      catch (e) {
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(150, 150, 150);
        doc.text('ANIMAL', photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight / 2 - 3, { align: 'center' });
        doc.text('PHOTO',  photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight / 2 + 4, { align: 'center' });
      }
    } else {
      doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(150, 150, 150);
      doc.text('ANIMAL', photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight / 2 - 3, { align: 'center' });
      doc.text('PHOTO',  photoBoxX + photoBoxWidth / 2, photoBoxY + photoBoxHeight / 2 + 4, { align: 'center' });
    }

    y = drawOwnerRow('Name:',         formData.name,                   y, lineEndX);
    y = drawOwnerRow('Mobile No:',    formData.mobile,                 y, lineEndX);
    // REMOVED: Alt. Contact field
    y = drawAddressRows('Address:',   formData.address, y, lineEndX, photoBottomY);
    if (y < photoBottomY) y = photoBottomY;
    y += BLOCK_GAP;

    // ---- ANIMAL INFORMATION ----
    y = drawSectionBox('ANIMAL INFORMATION', y);

    const sex = formData.sex === 'male' ? 'Male'
              : formData.sex === 'female' ? 'Female'
              : (getDisplayValue(formData.sex));

    // Check if diagnosis fits in a half-width column
    const diagStr  = getDisplayValue(formData.diagnosis);
    const diagMaxW = col2X - margin - LCW - 2;
    const diagFits = diagStr ? doc.splitTextToSize(diagStr, diagMaxW).length === 1 : true;

    // Row 1: Animal Name | Date & Time (no vertical divider)
    y = drawTwoColRowNoDivider('Animal Name:', formData.animal_name, 'Date & Time:', formattedDateTime, y);
    // Row 2: Age | Breed (no vertical divider)
    y = drawTwoColRowNoDivider('Age:',         formData.age,         'Breed:',       formData.breed, y);
    // Row 3: Sex | Body Colour (no vertical divider)
    y = drawTwoColRowNoDivider('Sex:',         sex,                  'Body Colour:', formData.body_colour, y);
    // Row 4: Injury | Diagnosis (if short) OR Injury alone (if diagnosis is long)
    if (diagFits) {
      // Diagnosis fits in right column — draw Injury | Diagnosis together (no vertical divider)
      y = drawTwoColRowNoDivider('Injury:', formData.animal_injury, 'Diagnosis:', diagStr, y);
    } else {
      // Injury on its own row (no vertical divider), then Diagnosis full-width wrapped below with proper spacing
      y = drawTwoColRowNoDivider('Injury:', formData.animal_injury, '', '', y);
      y = drawFullRowWrapped('Diagnosis:', diagStr, y);
    }

    y += BLOCK_GAP;

    // ---- DOCTOR & STAFF ----
    y = drawSectionBox('DOCTOR & STAFF', y);
    // Row with no vertical divider
    y = drawTwoColRowNoDivider('Present Doctor:', formData.present_dr,
                      'Present Staff:',  formData.present_staff, y);
    y += BLOCK_GAP;

    // ---- STATUS ----
    y = drawSectionBox('STATUS', y);

    const statusLabels  = ['Re-open', 'Release', 'Recover', 'Death'];
    const statusCount   = statusLabels.length;
    const dateSectionW  = 36;
    const remainingH    = pageHeight - margin - y - 2;
    const dynSpacing    = Math.floor(remainingH / statusCount);
    const dynStatusRowH = dynSpacing - 3;

    statusLabels.forEach((label, i) => {
      const sy = y + i * dynSpacing;
      doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.4); doc.setFillColor(252, 252, 252);
      doc.roundedRect(secX, sy, secW, dynStatusRowH, 2, 2, 'FD');
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
      doc.line(secX + dateSectionW, sy, secX + dateSectionW, sy + dynStatusRowH);
      doc.setFontSize(FS_SECTION); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
      doc.text(label.toUpperCase(), secX + dateSectionW / 2, sy + dynStatusRowH * 0.38, { align: 'center' });
      // UPDATED: Font size 8 for DATE placeholder
      doc.setFontSize(FS_DATE); doc.setFont('helvetica', 'normal'); doc.setTextColor(190, 190, 190);
      doc.text('DATE: DD / MM / YYYY', secX + dateSectionW / 2, sy + dynStatusRowH * 0.75, { align: 'center' });
    });

    return doc;
  }

  // ── View PDF: matches view page layout (photo left, fields right) ──
  static async generateViewPdf(formData, history = [], photoBase64 = null, logoBase64 = null) {
    const doc = new jsPDF();
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const secW   = pageWidth - margin * 2;

    const labelColor = [20, 20, 20];
    const valueColor = [0, 0, 0];
    const greyLine   = [210, 210, 210];
    const FS_FIELD   = 9;
    const FS_LABEL   = 7;
    const FS_SECTION = 12;
    const ROW_H      = 8;
    const ROW_H_TIGHT = 6;
    const SEC_BOX_H  = 9;
    const SEC_GAP    = 3;
    const BLOCK_GAP  = 5;
    const LCW        = 34;  // label column width for full-width rows

    const getVal = (v) => (v == null || v === '') ? '' : v.toString();

    const hLine = (y, x1 = margin, x2 = pageWidth - margin, col = greyLine, lw = 0.3) => {
      doc.setDrawColor(...col); doc.setLineWidth(lw);
      doc.line(x1, y, x2, y);
    };
    const vLine = (x, y1, y2, col = greyLine, lw = 0.3) => {
      doc.setDrawColor(...col); doc.setLineWidth(lw);
      doc.line(x, y1, x, y2);
    };

    const sectionBox = (title, y) => {
      doc.setDrawColor(0,0,0); doc.setLineWidth(0.5); doc.setFillColor(255,255,255);
      doc.roundedRect(margin, y, secW, SEC_BOX_H, 3, 3, 'FD');
      doc.setFontSize(FS_SECTION); doc.setFont('helvetica','bold'); doc.setTextColor(...labelColor);
      doc.text(title, pageWidth / 2, y + 6, { align: 'center' });
      return y + SEC_BOX_H + SEC_GAP;
    };

    const ensurePage = (y, needed = 20) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        doc.setDrawColor(0,0,0); doc.setLineWidth(0.5);
        doc.rect(4, 4, pageWidth - 8, pageHeight - 8);
        return margin + 4;
      }
      return y;
    };

    // Full-width label: value row
    const drawFullRow = (label, value, fy) => {
      const lines = doc.splitTextToSize(getVal(value), secW - LCW - 4);
      const rowH = Math.max(ROW_H, lines.length * ROW_H_TIGHT + 4);
      hLine(fy);
      doc.setFontSize(FS_FIELD); doc.setFont('helvetica','bold'); doc.setTextColor(...labelColor);
      doc.text(label, margin + 2, fy + 5.5);
      doc.setFont('helvetica','normal'); doc.setTextColor(...valueColor);
      let cy = fy;
      lines.forEach((ln, i) => { doc.text(ln, margin + LCW, cy + 5.5); if (i < lines.length - 1) cy += ROW_H_TIGHT; });
      const endY = Math.max(fy + rowH, cy + ROW_H_TIGHT);
      hLine(endY);
      return endY;
    };

    // Two-column label: value row (full width)
    const drawTwoColRow = (l1, v1, l2, v2, fy) => {
      const half = secW / 2;
      hLine(fy);
      doc.setFontSize(FS_FIELD); doc.setFont('helvetica','bold'); doc.setTextColor(...labelColor);
      doc.text(l1, margin + 2, fy + 5.5);
      doc.setFont('helvetica','normal'); doc.setTextColor(...valueColor);
      doc.text(doc.splitTextToSize(getVal(v1), half - LCW - 4)[0] || '', margin + LCW, fy + 5.5);
      vLine(margin + half, fy, fy + ROW_H);
      doc.setFontSize(FS_FIELD); doc.setFont('helvetica','bold'); doc.setTextColor(...labelColor);
      doc.text(l2, margin + half + 2, fy + 5.5);
      doc.setFont('helvetica','normal'); doc.setTextColor(...valueColor);
      doc.text(doc.splitTextToSize(getVal(v2), half - LCW - 4)[0] || '', margin + half + LCW, fy + 5.5);
      hLine(fy + ROW_H);
      return fy + ROW_H;
    };

    // ── Border + Header ──────────────────────────────────────────────
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.5);
    doc.rect(4, 4, pageWidth - 8, pageHeight - 8);

    let y = margin - 8;
    if (logoBase64) { try { doc.addImage(logoBase64, 'PNG', margin, y + 2, 26, 26); } catch(e) {} }
    doc.setFontSize(20); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,0);
    doc.text('Bezuban Charitable Trust', pageWidth / 2, y + 11, { align: 'center' });
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(0,0,139);
    doc.text('ANIMAL CASE REPORT', pageWidth / 2, y + 21, { align: 'center' });

    const tagText = `TAG: ${formData.tagNo || formData.tag_no || ''}`;
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    const tagTW = doc.getStringUnitWidth(tagText) * 13 / doc.internal.scaleFactor;
    const tagBW = tagTW + 8;
    const tagBX = pageWidth - margin - tagBW;
    doc.setFillColor(255,255,0); doc.setDrawColor(200,200,0);
    doc.roundedRect(tagBX, y + 7, tagBW, 7, 2, 2, 'FD');
    doc.setTextColor(0,0,0); doc.text(tagText, tagBX + 4, y + 12);
    y += 37;

    // ── Animal Information: photo LEFT, paired fields RIGHT ──────────
    y = sectionBox('ANIMAL INFORMATION', y);

    const PHOTO_W = 52;
    const PAIR_ROW_H = 14;     // height of each field pair alongside photo
    const PAIR_ROWS  = 4;
    const PHOTO_H    = PAIR_ROW_H * PAIR_ROWS;  // 56mm
    const FIELD_X    = margin + PHOTO_W + 4;
    const FIELD_W    = pageWidth - margin - FIELD_X;
    const HALF_FW    = FIELD_W / 2;

    // Photo box
    doc.setDrawColor(130,130,130); doc.setLineWidth(0.5);
    doc.rect(margin, y, PHOTO_W, PHOTO_H);
    if (photoBase64) {
      try { doc.addImage(photoBase64, 'JPEG', margin + 1, y + 1, PHOTO_W - 2, PHOTO_H - 2); } catch(e) {}
    } else {
      doc.setFontSize(7); doc.setFont('helvetica','italic'); doc.setTextColor(180,180,180);
      doc.text('ANIMAL', margin + PHOTO_W / 2, y + PHOTO_H / 2 - 3, { align: 'center' });
      doc.text('PHOTO',  margin + PHOTO_W / 2, y + PHOTO_H / 2 + 4, { align: 'center' });
    }

    // Helper: draw one cell (label top, value below) within the right-side grid
    const drawGridCell = (label, value, cx, cy, cw) => {
      doc.setFontSize(FS_LABEL); doc.setFont('helvetica','bold'); doc.setTextColor(120,120,120);
      doc.text(label, cx + 2, cy + 4);
      doc.setFontSize(FS_FIELD); doc.setFont('helvetica','normal'); doc.setTextColor(...valueColor);
      doc.text(doc.splitTextToSize(getVal(value), cw - 4)[0] || '', cx + 2, cy + 10);
    };

    const admitDate = formData.date
      ? new Date(formData.date).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' })
      : '';
    const sexLabel = formData.sex
      ? formData.sex.charAt(0).toUpperCase() + formData.sex.slice(1)
      : '';

    const pairRows = [
      ['Animal Name', formData.animal_name, 'Breed',          formData.breed],
      ['Body Colour', formData.body_colour,  'Sex',            sexLabel],
      ['Age',         formData.age,          'Injury',         formData.animal_injury],
      ['Admission Date', admitDate,          'Admission Time', formData.time || ''],
    ];

    let ry = y;
    pairRows.forEach(([l1, v1, l2, v2]) => {
      hLine(ry, FIELD_X, pageWidth - margin);
      drawGridCell(l1, v1, FIELD_X,           ry, HALF_FW);
      vLine(FIELD_X + HALF_FW, ry, ry + PAIR_ROW_H);
      drawGridCell(l2, v2, FIELD_X + HALF_FW, ry, HALF_FW);
      ry += PAIR_ROW_H;
    });
    hLine(ry, FIELD_X, pageWidth - margin);

    y = Math.max(y + PHOTO_H, ry) + BLOCK_GAP;

    // Full-width rows below the photo + grid
    y = drawFullRow('Diagnosis:', formData.diagnosis, y);
    y = drawTwoColRow('Owner Name:', formData.name, 'Mobile:', formData.mobile, y);
    y = drawFullRow('Address:', formData.address, y);
    y = drawTwoColRow('Doctor:', formData.present_dr, 'Staff:', formData.present_staff, y);
    y += BLOCK_GAP;

    // ── Treatment History ────────────────────────────────────────────
    y = ensurePage(y, 30);
    y = sectionBox('TREATMENT HISTORY', y);

    const statusColor = (s) => {
      if (s === 're_open') return [91, 33, 182];
      if (s === 'recover') return [22, 101, 52];
      if (s === 'release') return [29, 78, 216];
      if (s === 'death')   return [153, 27, 27];
      return [107, 114, 128];
    };
    const statusLabel = (s) => ({ re_open: 'Re-open', recover: 'Recover', release: 'Release', death: 'Death' }[s] || 'Unknown');
    const fmtDate = (d) => {
      if (!d) return '';
      try { return new Date(d).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }); }
      catch(e) { return d; }
    };

    if (!history.length) {
      doc.setFontSize(FS_FIELD); doc.setFont('helvetica','italic'); doc.setTextColor(150,150,150);
      doc.text('No treatment entries recorded.', pageWidth / 2, y + 6, { align: 'center' });
    } else {
      history.forEach((entry, idx) => {
        const descLines = doc.splitTextToSize(getVal(entry.description), secW - 6);
        const entryH = 9 + descLines.length * ROW_H_TIGHT + 4;
        y = ensurePage(y, entryH + 4);

        // Entry background
        const bg = idx % 2 === 0 ? 252 : 248;
        doc.setFillColor(bg, bg, bg === 252 ? 252 : 255);
        doc.setDrawColor(...greyLine); doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, secW, entryH, 2, 2, 'FD');

        // Status badge
        const sc = statusColor(entry.status);
        doc.setFillColor(...sc); doc.setDrawColor(...sc); doc.setLineWidth(0);
        const badgeW = 22, badgeH = 5.5;
        doc.roundedRect(margin + 2, y + 2, badgeW, badgeH, 1.5, 1.5, 'F');
        doc.setFontSize(7); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
        doc.text(statusLabel(entry.status).toUpperCase(), margin + 2 + badgeW / 2, y + 2 + badgeH * 0.65, { align: 'center' });

        // Date / time
        const dateStr = fmtDate(entry.date) + (entry.time ? `  ·  ${entry.time}` : '');
        doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,120);
        doc.text(dateStr, margin + badgeW + 6, y + 6);

        // Description
        doc.setFontSize(FS_FIELD); doc.setFont('helvetica','normal'); doc.setTextColor(...valueColor);
        descLines.forEach((line, li) => { doc.text(line, margin + 3, y + 11 + li * ROW_H_TIGHT); });

        y += entryH + 3;
      });
    }

    return doc;
  }

  static _formatAdmissionDateTime(formData) {
    if (!formData.date) return '';
    try {
      let dateTime = new Date(formData.date);
      if (formData.time && formData.time !== '') {
        const timeStr = formData.time;
        if (timeStr.includes(':')) {
          const timeParts    = timeStr.split(' ');
          const hourMinParts = timeParts[0].split(':');
          let hour   = parseInt(hourMinParts[0]);
          const minute = parseInt(hourMinParts[1]);
          if (timeParts.length > 1) {
            if (timeParts[1].toUpperCase() === 'PM' && hour < 12) hour += 12;
            else if (timeParts[1].toUpperCase() === 'AM' && hour === 12) hour = 0;
          }
          dateTime.setHours(hour, minute);
        }
      }
      const day   = String(dateTime.getDate()).padStart(2, '0');
      const month = String(dateTime.getMonth() + 1).padStart(2, '0');
      const year  = dateTime.getFullYear();
      let hours   = dateTime.getHours();
      const mins  = String(dateTime.getMinutes()).padStart(2, '0');
      const ampm  = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${day}/${month}/${year} (${String(hours).padStart(2, '0')}:${mins} ${ampm})`;
    } catch (e) { return formData.date?.toString() || ''; }
  }

  static async downloadPdf(pdf, fileName) {
    try { pdf.save(fileName); }
    catch (e) { console.error('Error downloading PDF:', e); throw e; }
  }

  static async openPdf(pdf, fileName) {
    try {
      const url = URL.createObjectURL(pdf.output('blob'));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) { console.error('Error opening PDF:', e); throw e; }
  }

  static async sharePdf(pdf, fileName, title = 'Animal Registration Form') {
    try {
      const pdfBlob = pdf.output('blob');
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([], '')] })) {
        await navigator.share({ title, text: 'Animal registration form', files: [new File([pdfBlob], fileName, { type: 'application/pdf' })] });
        return true;
      } else { pdf.save(fileName); return false; }
    } catch (e) { console.error('Error sharing PDF:', e); throw e; }
  }

  static async printPdf(pdf) {
    try {
      const url = URL.createObjectURL(pdf.output('blob'));
      const w = window.open(url);
      if (w) w.onload = () => w.print();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) { console.error('Error printing PDF:', e); throw e; }
  }

  static async imageFileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload  = () => resolve(r.result);
      r.onerror = e  => reject(e);
    });
  }

  static async loadLocalImageAsBase64(imagePath) {
    try {
      const blob = await (await fetch(imagePath)).blob();
      return await this.imageFileToBase64(blob);
    } catch (e) { console.error('Error loading image:', e); return null; }
  }
}

export default PdfService;