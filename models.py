from flask_sqlalchemy import SQLAlchemy
from website import db

# Define the db models here 
class User(db.Model):
    __tablename__ = 'user'  

    # Define fields
    user_id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(124), nullable=False)
    user_email = db.Column(db.String(255), unique=True, nullable=False)
    user_designation = db.Column(db.String(255), nullable=False)
    user_role = db.Column(db.Integer, nullable=False)  # 0 for admin, 1 for user
    user_cluster = db.Column(db.Enum('ENG', 'FCB', 'ICT', 'HSS', 'BCD'), nullable=False)
    password = db.Column(db.String(255), nullable=False)