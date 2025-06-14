from flask import Blueprint, render_template, request, jsonify, redirect, url_for
from models import db, User

views = Blueprint('views',__name__,static_folder='static')

# This file is a blueprint that has lots of urls, routes!
# Each route has a function which is for this is each view's function

review_sentiment_per=0.0

@views.route('/')
def base():
    return redirect(url_for('auth.login'))

# Example of connecting to the DB --> this example works [TO BE REMOVED AFTER TESTING]
# @views.route('/')
# def index():
#     try:
#         # Query the database (just a simple example)
#         user = User.query.first()  # Fetch the first user in the DB
#         return f'Hello, {user.user_name}!' if user else 'No user found.'
#     except Exception as e:
#         return f"Error connecting to DB: {str(e)}"

@views.route('/home')
def home():
    return render_template("home.html")

@views.route('/api/hello')
def hello():
    return jsonify({"message": "Hello from Banana 🍌!? Nononono????"})


@views.route('/banana')
def banana():
    return "<h1>Hello, You have found a banana! 🍌</h1>"