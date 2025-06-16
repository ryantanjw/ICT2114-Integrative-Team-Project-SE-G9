from flask import Blueprint,render_template,request,redirect,url_for,jsonify
from models import db, User
from flask_cors import CORS


auth = Blueprint('auth',__name__,static_folder='static')
CORS(auth)  # This will allow all domains to access the API


# This file is a blueprint that has lots of urls, routes!
# Each route has a function which is for this is each view's function

review_sentiment_per=0.0

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
    data = request.get_json()  # Get data from the POST request
    print("data:",data)
    
    # Validate that we have both email and password
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Missing email or password"}), 400
    
    email = data['email']
    password = data['password']
    
    # If user exists and password is correct:
    user = User.query.filter_by(user_email=email).first()
    if user and user.password == password:
        return jsonify({"success": True}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 400

# Example of connecting to the DB --> this example works [TO BE REMOVED AFTER TESTING]
# @views.route('/')
# def index():
#     try:
#         # Query the database (just a simple example)
#         user = User.query.first()  # Fetch the first user in the DB
#         return f'Hello, {user.user_name}!' if user else 'No user found.'
#     except Exception as e:
#         return f"Error connecting to DB: {str(e)}"


