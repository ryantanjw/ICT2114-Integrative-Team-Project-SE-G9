from flask import Blueprint,render_template,request,redirect,url_for
from models import db, User

auth = Blueprint('auth',__name__,static_folder='static')

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

# Example of connecting to the DB --> this example works [TO BE REMOVED AFTER TESTING]
# @views.route('/')
# def index():
#     try:
#         # Query the database (just a simple example)
#         user = User.query.first()  # Fetch the first user in the DB
#         return f'Hello, {user.user_name}!' if user else 'No user found.'
#     except Exception as e:
#         return f"Error connecting to DB: {str(e)}"
