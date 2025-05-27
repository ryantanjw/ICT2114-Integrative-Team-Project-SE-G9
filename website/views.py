from flask import Blueprint,render_template,request

views = Blueprint('views',__name__,static_folder='static')

# This file is a blueprint that has lots of urls, routes!
# Each route has a function which is for this is each view's function

review_sentiment_per=0.0

@views.route('/')
def home():
    return render_template("home.html")


@views.route('/banana')
def banana():
    return "<h1>Hello, You have found a banana! 🍌</h1>"