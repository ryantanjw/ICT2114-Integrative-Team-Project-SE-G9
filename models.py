from flask_sqlalchemy import SQLAlchemy
from website import db


# Define the db models here 

class KnownData(db.Model):
    __tablename__ = 'known_data'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    activity_name = db.Column(db.Text, nullable=True)
    hazard_type = db.Column(db.String(225), nullable=True)
    hazard_des = db.Column(db.Text, nullable=True)
    injury = db.Column(db.Text, nullable=True)
    control = db.Column(db.Text, nullable=True)
    severity = db.Column(db.Integer, nullable=True)
    likelihood = db.Column(db.Integer, nullable=True)
    rpn = db.Column(db.Integer, nullable=True)


class User(db.Model):
    __tablename__ = 'user'  

    # Define fields
    user_id = db.Column(db.Integer, primary_key=True)
    user_name = db.Column(db.String(124), nullable=False)
    user_email = db.Column(db.String(255), unique=True, nullable=False)
    user_designation = db.Column(db.String(255), nullable=True)
    user_role = db.Column(db.Integer, nullable=False)  # 0 for admin, 1 for user
    user_cluster = db.Column(db.Enum('ENG', 'FCB', 'ICT', 'HSS', 'BCD'), nullable=False)
    password = db.Column(db.String(255), nullable=False)

#No Changes
class Form(db.Model):
    __tablename__ = 'form'

    # Define fields
    form_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    form_reference_number = db.Column(db.Integer, nullable=True)
    form_user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    form_RA_team_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    title = db.Column(db.String(124), nullable=True)
    division = db.Column(db.String(124), nullable=True)
    process = db.Column(db.Text, nullable=True) # to be removed after done
    approval = db.Column(db.Integer, default=False, nullable=True)
    last_access_date = db.Column(db.DateTime, nullable=True)
    last_review_date = db.Column(db.DateTime, nullable=True)
    next_review_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.Integer, default=False, nullable=True)
    
class Process(db.Model):
    __tablename__ = 'process'

    # Define fields
    process_id = db.Column(db.Integer, primary_key=True)
    process_form_id = db.Column(db.Integer, db.ForeignKey('form.form_id'), nullable=False)
    process_number = db.Column(db.Integer, nullable=False) 
    process_title = db.Column(db.String(124), nullable=False)
    process_location = db.Column(db.String(255), nullable=True)
    
class Hazard(db.Model):
    __tablename__ = 'hazard'

    # Define fields
    hazard_id = db.Column(db.Integer, primary_key=True)
    hazard_activity_id = db.Column(db.Integer, db.ForeignKey('activity.activity_id'), nullable=False)
    hazard = db.Column(db.String(124), nullable=False)
    injury = db.Column(db.String(124), nullable=False)
    hazard_type_id = db.Column(db.Integer, db.ForeignKey('hazard_type.hazard_type_id'), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    approval = db.Column(db.Integer, nullable=True)  # 0 for no approval, 1 for approval required
    
class HazardType(db.Model):
    __tablename__ = 'hazard_type'

    # Define fields
    hazard_type_id = db.Column(db.Integer, primary_key=True)
    hazard_type = db.Column(db.String(124), nullable=False)
    hazard_approval = db.Column(db.Integer, nullable=True)  # 0 for no approval, 1 for approval required
    hazard_approval_by = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=True) 
    
class Risk(db.Model):
    __tablename__ = 'risk'

    # Define fields
    risk_id = db.Column(db.Integer, primary_key=True)
    risk_hazard_id = db.Column(db.Integer, db.ForeignKey('hazard.hazard_id'), nullable=False)
    existing_risk_control = db.Column(db.Text, nullable=True)
    additional_risk_control = db.Column(db.Text, nullable=True)
    severity = db.Column(db.Integer, nullable=False)
    likelihood = db.Column(db.Integer, nullable=False)
    RPN = db.Column(db.Integer, nullable=False)
    
class Activity(db.Model):
    __tablename__ = 'activity'

    # Define fields
    activity_id = db.Column(db.Integer, primary_key=True)
    activity_process_id = db.Column(db.Integer, db.ForeignKey('process.process_id'), nullable=False)
    work_activity = db.Column(db.String(255), nullable=False)
    activity_number = db.Column(db.Integer, nullable=False)
    activity_remarks = db.Column(db.String(255), nullable=True)
    
class RA_team(db.Model):
    __tablename__ = 'RA_team'

    # Define fields
    RA_team_id = db.Column(db.Integer, primary_key=True)
    RA_leader = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    
class RA_team_member(db.Model):
    __tablename__ = 'RA_team_member'

    # Define fields
    RA_team_id = db.Column(db.Integer, db.ForeignKey('RA_team.RA_team_id'),primary_key=True, nullable=False)
    RA_team_member = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)

class share_access(db.Model):
    __tablename__ = 'share_access'

    # Define fields
    shared_user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), primary_key=True)
    shared_form_id = db.Column(db.Integer, db.ForeignKey('form.form_id'), primary_key=True)