from flask import Blueprint, app,render_template,request,redirect,url_for,jsonify, session
from models import db, User, Audit
from flask_cors import CORS
from werkzeug.security import check_password_hash
from datetime import datetime, timezone, timedelta

# Define Singapore timezone (GMT+8)
SINGAPORE_TZ = timezone(timedelta(hours=8))



auth = Blueprint('auth',__name__,static_folder='static')
CORS(auth, supports_credentials=True)  # Enable credentials support for cookies


# This file is a blueprint that has lots of urls, routes!
# Each route has a function which is for this is each view's function

review_sentiment_per=0.0

def create_audit_log(audit_user_id, action, target_user_id):
    """
    Create an audit log entry
    
    Args:
        audit_user_id: ID of the user performing the action
        action: Description of the action (e.g., 'POST - login', 'PUT - edit user details')
        target_user_id: ID of the user being affected by the action
    
    Returns:
        bool: True if successful, False otherwise
    """
    print(f"\n=== CREATE AUDIT LOG CALLED ===")
    print(f"Input - User ID: {audit_user_id}, Action: '{action}', Target: {target_user_id}")
    
    try:
        # Extract action type from action string (e.g., "POST" from "POST - login")
        action_type = action.split(" - ")[0] if " - " in action else ""
        action = action.split(" - ")[1] if " - " in action else action
        
        # Get target user's name
        target_user = User.query.get(target_user_id)
        target_user_name = target_user.user_name if target_user else f"User ID: {target_user_id}"
        
        # Get current Singapore time (GMT+8)
        singapore_time = datetime.now(SINGAPORE_TZ)
        
        print(f"Creating audit log with:")
        print(f"  - audit_user: {audit_user_id}")
        print(f"  - audit_action: {action}")
        print(f"  - audit_actiontype: {action_type}")
        print(f"  - audit_targetuser: {target_user_name}")
        print(f"  - audit_time: {singapore_time}")
        
        audit_log = Audit(
            audit_user=audit_user_id,
            audit_action=action,
            audit_actiontype=action_type,
            audit_targetuser=target_user_name,
            audit_time=singapore_time
        )
        
        print(f"Audit object created: {audit_log}")
        print(f"Audit object attributes: audit_id={audit_log.audit_id}, audit_user={audit_log.audit_user}")
        
        db.session.add(audit_log)
        print("Audit log added to session")
        
        db.session.flush()
        print(f"Session flushed, audit_id should be: {audit_log.audit_id}")
        
        db.session.commit()
        print(f"✅ Audit log committed successfully with ID: {audit_log.audit_id}")
        print(f"✅ Audit log created: User {audit_user_id} - Action: '{action}' - Type: '{action_type}' - Target: {target_user_name}")
        return True
    except Exception as e:
        print(f"❌ Error creating audit log: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        print("Database session rolled back")
        return False

@auth.route('/login', methods=['GET', 'POST'])  # Make sure to allow both GET and POST methods
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        try:
            #SELECT WHERE
            user = User.query.filter_by(user_email=email).first()

            if user:
                if (user.password == password):
                    return redirect(url_for('views.home'))  # Replace 'auth.dashboard' with the name of the route you want to redirect to
                else:
                    #TODO: Error Handling for invalid password
                    return "Invalid password"
            else:
                #TODO: Error Handling for unknown User
                #This will return an error and tell the user invalid email n pw
                return "User not found"
            
        except Exception as e:
            return f"Error: {str(e)}"

    return render_template("login.html")

@auth.route('/login_test', methods=['POST'])
def login_test():
    data = request.get_json()
    print("==== LOGIN ATTEMPT ====")
    print("Request data:", data)
    
    if not data or 'email' not in data or 'password' not in data:
        print("Missing email or password")
        return jsonify({"success": False, "error": "Missing email or password"}), 400
    
    email = data['email']
    password = data['password']
    
    user = User.query.filter_by(user_email=email).first()
    print(f"User found: {user is not None}")
    
    if user and check_password_hash(user.password, password):
        # Clear any existing session
        session.clear()
        
        # Set session data
        session['user_id'] = user.user_id
        session['user_email'] = user.user_email
        session['user_role'] = user.user_role
        
        # Force session to save
        session.modified = True
        
        print(f"Login successful for {email} with role {user.user_role}")
        print(f"Session created: {session}")
        print(f"Session keys: {list(session.keys())}")
        
        # Log the login action to audit table
        create_audit_log(user.user_id, "POST - login", user.user_id)
        
        # Create response - don't set cookies manually, let Flask handle it
        response = jsonify({
            "success": True, 
            "user_role": user.user_role,
            "user_name": user.user_name
        })
        
        # Add cache control headers
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        return response, 200
    else:
        error_msg = "Invalid email or password"
        if user:
            print(f"Password mismatch for user {email}")
        else:
            print(f"User not found: {email}")
        return jsonify({"success": False, "error": error_msg}), 401        
    
    
@auth.route('/check_session', methods=['GET'])
def check_session():
    print("=== CHECK SESSION CALLED ===")
    print(f"Current session object: {session}")
    print(f"Session dictionary: {dict(session)}")
    print(f"Request cookies: {request.cookies}")
    
    # Debug cookie/session info
    session_cookie = request.cookies.get('session')
    print(f"Session cookie present: {session_cookie is not None}")
    if session_cookie:
        print(f"Session cookie length: {len(session_cookie)}")
    
    if 'user_id' in session:
        user_data = {
            "logged_in": True,
            "user_id": session['user_id'],
            "user_email": session['user_email'],
            "user_role": session['user_role']
        }
        print(f"Session found! User role: {session['user_role']}")
        return jsonify(user_data)
    
    print("No active session found in check_session route")
    return jsonify({"logged_in": False}
    ) 
    
@auth.route('/logout', methods=['POST', 'GET'])
def logout():
    print("=== LOGOUT CALLED ===")
    print(f"Before logout - Session: {session}")
    
    # Log the logout action before clearing session
    if 'user_id' in session:
        user_id = session['user_id']
        create_audit_log(user_id, "POST - logout", user_id)
    
    session.clear()
    print(f"After logout - Session: {session}")
    return jsonify({"success": True})

# Add these test routes to debug the session
@auth.route('/set_test_session', methods=['GET'])
def set_test_session():
    session['test_value'] = 'This is a test'
    print(f"Set test session: {session}")
    return jsonify({"success": True, "message": "Test session set"})

@auth.route('/get_test_session', methods=['GET'])
def get_test_session():
    test_value = session.get('test_value', 'No session found')
    print(f"Get test session: {session}")
    return jsonify({"test_value": test_value})

@auth.route('/forgot_password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    
    if not data or 'email' not in data or 'new_password' not in data:
        return jsonify({"success": False, "error": "Missing fields"}), 400

    user = User.query.filter_by(user_email=data['email']).first()

    if not user:
        return jsonify({"success": False, "error": "Email not found"}), 404

    # In production: verify email with token or OTP before allowing this
    user.password = data['new_password']  # hash this in production
    db.session.commit()

    return jsonify({"success": True, "message": "Password reset successful"})


# Example of connecting to the DB --> this example works [TO BE REMOVED AFTER TESTING]
# @views.route('/')
# def index():
#     try:
#         # Query the database (just a simple example)
#         user = User.query.first()  # Fetch the first user in the DB
#         return f'Hello, {user.user_name}!' if user else 'No user found.'
#     except Exception as e:
#         return f"Error connecting to DB: {str(e)}"


