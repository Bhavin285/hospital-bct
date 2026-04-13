import os

# Set env vars before any handler module is imported
os.environ.setdefault("USERS_TABLE", "bct-users-test")
os.environ.setdefault("TABLE_NAME", "bct-admit-forms-test")
os.environ.setdefault("PHOTO_BUCKET", "bct-photos-test")
