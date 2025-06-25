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


