from flask import Blueprint, jsonify, request, session
from werkzeug.security import generate_password_hash
from models import User, Form, Activity
from . import db
import random
import string
from flask_cors import CORS, cross_origin
import json

# Create a new blueprint for user routes

user = Blueprint('user', __name__,static_folder='static')
CORS(user, supports_credentials=True)  # Enable credentials support for cookies

#Route for retrieving user forms
@user.route('/retrieveForms', methods=['GET'])
def retrieve_forms():
    print(f"RETRIEVING USER FORMS")

    try:
        print("=== Retrieve Forms Debug ===")
        print(f"Session data: {session}")

        user_id='1'

        # user_id = session.get('user_id') or request.args.get('user_id')

        print(f"Form model: {Form}")

        forms = Form.query.filter_by(form_user_id=user_id).all()

        print(f"Forms:", forms)

        forms_list = []
        for form in forms:

            def format_date(date_obj):
                return date_obj.isoformat() if date_obj else None
            
            # Create status based on approval and dates
            status = "Draft"
            if form.approval == 1:
                status = "Approved"
            elif form.approval == 0:
                status = "Pending Approval"

            # Check if review is due
            if form.next_review_date:
                from datetime import datetime
                if form.next_review_date < datetime.now():
                    status = "Review Due"


            forms_list.append({
                'id': form.form_id,
                'title': form.title or "Untitled Form",
                'form_reference_number': form.form_reference_number,
                'location': form.location,
                'division': form.division,
                'process': form.process,
                'status': status,
                'approval': form.approval,
                'created_at': format_date(form.last_access_date),  # Using last_access_date as created_at
                'last_access_date': format_date(form.last_access_date),
                'last_review_date': format_date(form.last_review_date),
                'next_review_date': format_date(form.next_review_date),
                'form_user_id': form.form_user_id,
                'form_RA_team_id': form.form_RA_team_id,
                'approved_by': form.approved_by
            })

        return jsonify(forms_list)
     
    except Exception as e:
        print(f"Error retrieving forms: {e}")
        return jsonify({'error': 'Failed to retrieve forms'}), 500
     


@user.route('/form1', methods=['POST'])
def base():
    print("\nSAVE FORM 1 CALLED")

    data = request.get_json()
    print(f"Received data: {data}")  # Debug what you're getting

    userid = data.get('userId')
    print(f"current user id:", userid)

    #NEED TO GET USER_ID OF LOGGED IN USER

    if (not data or 
            not data.get('title') or 
            not data.get('division') or 
            not data.get('processes')):
            return jsonify({"success": False, "error": "Missing required fields"}), 400
    
    try:
        form_id = data.get('form_id')

        if form_id:
              form = Form.query.get(form_id)
              if not form:
                    return jsonify({"error:" "Form not Found"}), 404
              print(f"Updating existing form with ID: {form_id}")

        else:
              form = Form()
              form.form_user_id = userid
              db.session.add(form)
        
        form.title = data['title']
        form.division = data['division']
        form.process = json.dumps(data['processes'])

        db.session.commit()

        save_activities_to_db(form.form_id, data['processes'])  # Use data['processes'], not form.process


        return jsonify({
            "success": True,
            "form_id": form.form_id,
            "message": "Form saved successfully",
            "form_id": form.form_id,  # Assuming your primary key is 'id'
            "action": "updated" if form_id else "created"
        }), 200

    except Exception as e:
          db.session.rollback()
          return jsonify({"error": str(e)}), 500
    
#helper function
def save_activities_to_db(form_id, processes):
    """
    Save activities to the activities table
    processes: the original processes list from the request data
    """
    try:
        # Delete existing activities for this form (if updating)
        Activity.query.filter(Activity.form_id == form_id).delete()
        
        # Extract activities from processes
        for process in processes:  # Now iterating over the actual list
            activities = process.get('activities', [])
            for activity in activities:
                # Create new Activity record
                new_activity = Activity(
                    form_id=form_id,
                    work_activity=activity.get('description', ''),
                    hazard_id=None  # You'll need to determine how to set this
                )
                db.session.add(new_activity)
        
        db.session.commit()
        print(f"Successfully saved activities for form {form_id}")
        
    except Exception as e:
        db.session.rollback()
        print(f"Error saving activities: {e}")
        raise


