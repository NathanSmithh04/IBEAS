from flask import Flask, render_template, request, redirect, abort, jsonify
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from flask_cors import CORS
from functools import wraps
from jose import jwt as jose_jwt
import re, os, json
from urllib.request import urlopen
from authlib.integrations.flask_client import OAuth
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger
from dateutil.relativedelta import relativedelta
import pytz

load_dotenv()
scheduler = BackgroundScheduler()

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
jwt = JWTManager(app)
db = SQLAlchemy(app)
oauth = OAuth(app)
auth0 = oauth.register(
    'auth0',
    client_id=os.getenv('AUTH0_CLIENT_ID'),
    client_secret=os.getenv('AUTH0_CLIENT_SECRET'),
    api_base_url=f'https://{os.getenv("AUTH0_DOMAIN")}',
    access_token_url=f'https://{os.getenv("AUTH0_DOMAIN")}/oauth/token',
    authorize_url=f'https://{os.getenv("AUTH0_DOMAIN")}/authorize',
    client_kwargs={
        'scope': 'openid profile email',
    })

EMAIL_ROUTE = 'http://127.0.0.1:5000/email'

AUTH0_DOMAIN = os.getenv('AUTH0_DOMAIN')
AUTH0_AUDIENCE = os.getenv('AUTH0_AUDIENCE')

USER_FIRST_NAME_MAX_LENGTH = 50
USER_LAST_NAME_MAX_LENGTH = 50
USER_EMAIL_MAX_LENGTH = 100
EMAILS_SUBJECT_MAX_LENGTH = 100
EMAILS_BODY_MAX_LENGTH = 4000
EMAILS_RECIPIENTS_MAX_LENGTH = 1000
EMAILS_SEND_TIME_MAX_LENGTH = 100
EMAILS_CODE_MAX_LENGTH = 100
EMAILS_INTERVAL_MAX_LENGTH = 100
EMAILS_TIMEZONE_MAX_LENGTH = 100

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(USER_FIRST_NAME_MAX_LENGTH))
    last_name = db.Column(db.String(USER_LAST_NAME_MAX_LENGTH))
    email = db.Column(db.String(USER_EMAIL_MAX_LENGTH))

    def __init__(self, first_name, last_name, email):
        self.first_name = first_name
        self.last_name = last_name
        self.email = email

class Emails(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)
    subject = db.Column(db.String(EMAILS_SUBJECT_MAX_LENGTH))
    body = db.Column(db.String(EMAILS_BODY_MAX_LENGTH))
    recipients = db.Column(db.String(EMAILS_RECIPIENTS_MAX_LENGTH))
    send_time = db.Column(db.String(EMAILS_SEND_TIME_MAX_LENGTH))
    code = db.Column(db.String(EMAILS_CODE_MAX_LENGTH))
    interval = db.Column(db.String(EMAILS_INTERVAL_MAX_LENGTH))
    last_checkin = db.Column(db.DateTime)
    timezone = db.Column(db.String(EMAILS_TIMEZONE_MAX_LENGTH))

    def __init__(self, user_id, subject, body, recipients, send_time, code, interval, last_checkin, timezone):
        self.user_id = user_id
        self.subject = subject
        self.body = body
        self.recipients = recipients
        self.send_time = send_time
        self.code = code
        self.interval = interval
        self.last_checkin = last_checkin
        self.timezone = timezone

def check_auth(token): # Auth0 token verification
    try:
        unverified_header = jose_jwt.get_unverified_header(token)
    except jose_jwt.JWTError as e:
        print(f"Error getting unverified header: {e}")
        return False

    rsa_key = {}
    if 'kid' not in unverified_header:
        print("Error: 'kid' not in unverified header")
        return False
    
    try:
        jsonurl = urlopen(f'https://{AUTH0_DOMAIN}/.well-known/jwks.json')
        jwks = json.loads(jsonurl.read())
    except Exception as e:
        print(f"Error retrieving JWKS: {e}")
        return False

    for key in jwks['keys']:
        if key['kid'] == unverified_header['kid']:
            rsa_key = {
                'kty': key['kty'],
                'kid': key['kid'],
                'use': key['use'],
                'n': key['n'],
                'e': key['e']
            }
            break
    
    if rsa_key:
        try:
            payload = jose_jwt.decode(
                token,
                rsa_key,
                algorithms=['RS256'],
                audience=AUTH0_AUDIENCE,
                issuer=f'https://{AUTH0_DOMAIN}/'
            )
            return payload
        except jose_jwt.ExpiredSignatureError:
            print("Error: Token is expired")
            return False
        except jose_jwt.JWTClaimsError as e:
            print(f"Error: Claims are incorrect: {e}")
            return False
        except Exception as e:
            print(f"Error: {e}")
            return False
    
    return False

def token_required(f): # API route protection
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'error': 'Token is missing!'}), 401

        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) != 2:
            return jsonify({'error': 'Token is invalid!'}), 401

        token = parts[1]

        payload = check_auth(token)
        if not payload:
            print("Token is invalid!")
            return jsonify({'error': 'Token is invalid!'}), 401

        return f(*args, **kwargs)

    return decorated

# def admin_protection(f): # Basic admin protection
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         if request.remote_addr != '127.0.0.1':
#             abort(403)
#         else:
#             return f(*args, **kwargs)
#     return decorated

# @app.route('/', methods=['GET'])
# @admin_protection
# def index():
#     users = User.query.order_by(User.id).all()
#     emails = Emails.query.order_by(Emails.id).all()
#     return render_template('index.html', users=users, emails=emails)

# @app.route('/add_user', methods=['POST'])
# @admin_protection
# def add_user():
#     if request.method == 'POST':
#         first_name = request.form['first_name']
#         last_name = request.form['last_name']
#         email = request.form['email']
#         user = User(first_name, last_name, email)
#         db.session.add(user)
#         if first_name and last_name and email:
#             if is_valid_email(email):
#                 db.session.commit()
#             else:
#                 return "Invalid email"
#         else:
#             return "All fields are required"
#     return redirect('/')

# @app.route('/add_email', methods=['POST'])
# @admin_protection
# def add_email():
#     if request.method == 'POST':
#         user_id = request.form['user_id']
#         if user_id not in [str(user.id) for user in User.query.all()]:
#             return "Invalid user id"
#         subject = request.form['subject']
#         body = request.form['body']
#         recipients = request.form['recipients']
#         send_time = request.form['send_time']
#         code = request.form['code']
#         interval = request.form['interval']
#         last_checkin = datetime.now()
#         print(send_time)
#         email = Emails(user_id, subject, body, recipients, send_time, code, interval, last_checkin)
#         db.session.add(email)
#         db.session.commit()
#         schedule_email_send_time(email)
#         schedule_email_interval(email)
#     return redirect('/')

# @app.route('/update_user/<int:id>', methods=['POST'])
# @admin_protection
# def update_user(id):
#     user = db.session.get(User, id)
#     if 'delete' in request.form:
#         db.session.delete(user)
#         db.session.commit()
#     elif 'save' in request.form:
#         first_name = request.form['first_name'].strip()
#         last_name = request.form['last_name'].strip()
#         email = request.form['email'].strip()
#         if first_name and last_name and email:
#             if is_valid_email(email):
#                 user.first_name = first_name
#                 user.last_name = last_name
#                 user.email = email
#                 db.session.commit()
#             else:
#                 return "Invalid email"
#         else:
#             return "All fields are required"
#     return redirect('/')

# @app.route('/update_email/<int:id>', methods=['POST'])
# @admin_protection
# def update_email(id):
#     email = db.session.get(Emails, id)
#     if 'delete' in request.form:
#         db.session.delete(email)
#         db.session.commit()
#     elif 'save' in request.form:
#         old_send_time = email.send_time
#         old_interval = email.interval
#         subject = request.form['subject']
#         body = request.form['body']
#         recipients = request.form['recipients']
#         send_time = request.form['send_time']
#         code = request.form['code']
#         interval = request.form['interval']
#         if subject and body and recipients and send_time and code and interval:
#             email.subject = subject
#             email.body = body
#             email.recipients = recipients
#             email.send_time = send_time
#             email.code = code
#             email.interval = interval
#             db.session.commit()
#             if old_send_time != send_time:
#                 reschedule_email_send_time(email)
#             if old_interval != interval:
#                 reschedule_email_interval(email)
#         else:
#             return "All fields are required"
#     return redirect('/')

@app.route('/login', methods=['POST'])
@token_required
def login():
    data = request.get_json()
    email = data['email']
    token = request.headers.get('Authorization').split()[1]
    payload = check_auth(token)
    if payload:
        auth0_email = payload.get(EMAIL_ROUTE)
        if auth0_email:
            existing_user = User.query.filter_by(email=auth0_email).first()
            if existing_user:
                first_name = existing_user.first_name
                last_name = existing_user.last_name
                return {"first_name": first_name, "last_name": last_name, "email": auth0_email}
            first_name = "FirstName"
            last_name = "LastName"
            if is_valid_email(auth0_email):
                user = User(first_name, last_name, auth0_email)
                db.session.add(user)
                db.session.commit()
                return {"first_name": first_name, "last_name": last_name, "email": auth0_email}
    return {"error": "Cannot login"}

@app.route('/get_user_names', methods=['GET'])
@token_required
def get_user_names():
    token = request.headers.get('Authorization').split()[1]
    payload = check_auth(token)
    if payload:
        email = payload.get(EMAIL_ROUTE)
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                return {"first_name": user.first_name, "last_name": user.last_name}
    return {"error": "Cannot get user info"}

@app.route("/request_emails", methods=['POST'])
@token_required
def request_emails():
    token = request.headers.get('Authorization').split()[1]
    data = request.get_json()
    payload = check_auth(token)
    if payload:
        email = payload.get(EMAIL_ROUTE)
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                if "code" in data:
                    code = data["code"]
                    emails = Emails.query.filter_by(user_id=user.id, code=code).all()
                    if emails:
                        return {"emails": [{"id": email.id, "subject": email.subject, "body": email.body, "recipients": email.recipients, "send_time": email.send_time, "interval": email.interval, "interval_next_send": parse_interval(email), "timezone": timezone} for email in emails]}
                    else:
                        return {"error": "Incorrect code or no emails found"}
    return {"error": "Cannot get emails"}

@app.route('/change_name', methods=['POST'])
@token_required
def change_name():
    data = request.get_json()
    new_name = data['new_name'].split()
    if len(new_name) == 2:
        first_name, last_name = new_name
        if len(first_name) <= USER_FIRST_NAME_MAX_LENGTH and len(last_name) <= USER_LAST_NAME_MAX_LENGTH:
            token = request.headers.get('Authorization').split()[1]
            payload = check_auth(token)
            if payload:
                email = payload.get(EMAIL_ROUTE)
                if email:
                    user = User.query.filter_by(email=email).first()
                    if user:
                        user.first_name = first_name
                        user.last_name = last_name
                        db.session.commit()
                        return {"first_name": first_name, "last_name": last_name}
        else:
            return {"error": "Name too long"}
    else:
        return {"error": "Invalid name"}
    return {"error": "Cannot change name"}

@app.route('/change_email_data', methods=['POST'])
@token_required
def change_email_data():
    token = request.headers.get('Authorization').split()[1]
    data = request.get_json()
    payload = check_auth(token)
    if payload:
        email = payload.get(EMAIL_ROUTE)
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                code = data.get('code')
                changes_list = data.get('changes')
                if code and changes_list:
                    for changes in changes_list:
                        for key, value in changes.items():
                            if key == 'send_time' and value:
                                if not is_valid_send_time(value):
                                    return {"error": "Invalid send time in one or more emails"}
                            elif key == 'interval':
                                if not is_valid_interval(value):
                                    return {"error": "Invalid interval in one or more emails"}
                            elif key == 'recipients':
                                if not is_valid_recipients(value):
                                    return {"error": "Invalid recipients in one or more emails"}
                            elif key == 'timezone':
                                if not is_valid_timezone(value):
                                    return {"error": "Invalid timezone in one or more emails"}
                            if (key == 'subject' and len(value) > EMAILS_SUBJECT_MAX_LENGTH) or (key == 'body' and len(value) > EMAILS_BODY_MAX_LENGTH) or (key == 'recipients' and len(value) > EMAILS_RECIPIENTS_MAX_LENGTH) or (key == 'send_time' and len(value) > EMAILS_SEND_TIME_MAX_LENGTH) or (key == 'interval' and len(value) > EMAILS_INTERVAL_MAX_LENGTH) or (key == 'timezone' and len(value) > EMAILS_TIMEZONE_MAX_LENGTH):
                                return {"error": "One or more values are too long"}
                    return_info = []
                    for changes in changes_list:
                        email_id = changes.get('id')
                        if email_id:
                            email = Emails.query.filter_by(id=email_id, user_id=user.id, code=code).first()
                            if email:
                                old_send_time = email.send_time
                                old_interval = email.interval
                                for key, value in changes.items():
                                    if key == 'subject':
                                        email.subject = value
                                    elif key == 'body':
                                        email.body = value
                                    elif key == 'recipients':
                                        email.recipients = value
                                    elif key == 'send_time':
                                        email.send_time = value
                                    elif key == 'interval':
                                        email.interval = value
                                        return_info.append({"id": email.id, "interval_next_send": parse_interval(email)})
                                    elif key == 'timezone':
                                        email.timezone = value
                                db.session.commit()
                                if old_send_time != email.send_time:
                                    reschedule_email_send_time(email)
                                if old_interval != email.interval:
                                    reschedule_email_interval(email)
                    return {"success": return_info}
    return {"error": "Cannot change email data"}

@app.route('/add_email_data', methods=['POST'])
@token_required
def add_email_data():
    token = request.headers.get('Authorization').split()[1]
    data = request.get_json()
    payload = check_auth(token)
    if payload:
        email = payload.get(EMAIL_ROUTE)
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                subject = data.get('subject')
                body = data.get('body')
                recipients = data.get('recipients')
                send_time = data.get('send_time')
                code = data.get('code')
                interval = data.get('interval')
                last_checkin = datetime.now()
                timezone = data.get('timezone')
                if send_time:
                    if not is_valid_send_time(send_time):
                        return {"error": "Invalid send time"}
                if not is_valid_interval(interval):
                    return {"error": "Invalid interval"}
                if not is_valid_recipients(recipients):
                    return {"error": "Invalid recipients"}
                if not is_valid_timezone(timezone):
                    return {"error": "Invalid timezone"}
                if subject and body and recipients and code and interval and timezone:
                    if len(subject) <= EMAILS_SUBJECT_MAX_LENGTH and len(body) <= EMAILS_BODY_MAX_LENGTH and len(recipients) <= EMAILS_RECIPIENTS_MAX_LENGTH and len(str(send_time)) <= EMAILS_SEND_TIME_MAX_LENGTH and len(code) <= EMAILS_CODE_MAX_LENGTH and len(interval) <= EMAILS_INTERVAL_MAX_LENGTH and len(timezone) <= EMAILS_TIMEZONE_MAX_LENGTH:
                        email = Emails(user.id, subject, body, recipients, send_time, code, interval, last_checkin, timezone)
                        db.session.add(email)
                        db.session.commit()
                        schedule_email_send_time(email)
                        schedule_email_interval(email)
                        return {"id": email.id, "subject": email.subject, "body": email.body, "recipients": email.recipients, "send_time": email.send_time, "interval": email.interval, timezone: email.timezone}
                    else:
                        return {"error": "One or more values are too long"}
                else:
                    return {"error": "Missing one or more values"}
    return {"error": "Cannot add email data"}

@app.route('/delete_email_data', methods=['POST'])
@token_required
def delete_email_data():
    token = request.headers.get('Authorization').split()[1]
    data = request.get_json()
    payload = check_auth(token)
    if payload:
        email = payload.get(EMAIL_ROUTE)
        if email:
            user = User.query.filter_by(email=email).first()
            if user:
                code = data.get('code')
                email_id = data.get('id')
                if code and email_id:
                    email = Emails.query.filter_by(id=email_id, user_id=user.id, code=code).first()
                    if email:
                        db.session.delete(email)
                        db.session.commit()
                        unschedule_email_send_time(email.id)
                        unschedule_email_interval(email.id)
                        return {"success": "Email deleted"}
    return {"error": "Cannot delete email data"}

@app.route('/check_connection', methods=['GET'])
def check_connection():
    return {"success": "Connection successful"}

def is_valid_timezone(timezone):
    return timezone in pytz.all_timezones

def is_valid_email(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

def is_valid_send_time(send_time):
    pattern = r'^2024-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d$'
    if not re.match(pattern, send_time):
        return False
    try:
        datetime.strptime(send_time, "%Y-%m-%dT%H:%M")
        return True
    except ValueError:
        return False

def is_valid_interval(interval):
    cleaned_interval = interval.replace(" ", "")
    type_regex = r"(\d+[yY])|(\d+M)|(\d+[dD])|(\d+[hH])|(\d+m)"
    matches = re.findall(type_regex, cleaned_interval)
    if not matches:
        return False
    types = set()
    for match in matches:
        match = next(m for m in match if m)
        type_indicator = match[-1]
        type_ = type_indicator if type_indicator in ['M', 'm'] else type_indicator.lower()
        if type_ in types:
            return False
        types.add(type_)
    return cleaned_interval == ''.join(next(m for m in match if m) for match in matches)



def is_valid_recipients(recipients):
    emails = [email.strip() for email in recipients.split(',')]
    for email in emails:
        if not is_valid_email(email):
            return False
    return True

def parse_interval(email):
    duration_str = email.interval
    last_checkin = email.last_checkin
    if is_valid_interval(duration_str):
        pass
    else:
        return None
    parts = re.findall(r'(\d+)([YyMmDdHh])', duration_str)
    kwargs = {
        'years': 0,
        'months': 0,
        'days': 0,
        'hours': 0,
        'minutes': 0
    }
    for num, unit in parts:
        num = int(num)
        if unit.lower() == 'y':
            kwargs['years'] = num
        elif unit.lower() == 'm' and unit.islower():
            kwargs['minutes'] = num
        elif unit.lower() == 'd':
            kwargs['days'] = num
        elif unit.lower() == 'h':
            kwargs['hours'] = num
        elif unit == 'M':
            kwargs['months'] = num
    new_datetime = last_checkin + relativedelta(
        years=kwargs['years'],
        months=kwargs['months'],
        days=kwargs['days'],
        hours=kwargs['hours'],
        minutes=kwargs['minutes']
    )
    formatted_datetime = new_datetime.strftime('%Y-%m-%d %H:%M:%S')
    return formatted_datetime

def send_email(email_id):
    with app.app_context():
        email = db.session.get(Emails, email_id)
        if email:
            print(f"Sending email {email_id} to {email.recipients}")
        else:
            print(f"Email {email_id} not found")

def schedule_email_send_time(email):
    try:
        if email.send_time:
            send_time = datetime.fromisoformat(email.send_time)
            current_time = datetime.now()
            if send_time > current_time:
                scheduler.add_job(
                    send_email,
                    DateTrigger(run_date=send_time),
                    args=[email.id],
                    id=str(email.id)
                )
                print(f"[SEND TIME] Scheduled email {email.id} for {send_time}")
            else:
                print(f"[SEND TIME] Email {email.id} is in the past")
        else:
            print(f"[SEND TIME] Email {email.id} has no send time")
    except Exception as e:
        print(f"[SEND TIME] Error scheduling email {email.id}: {e}")

def schedule_email_interval(email):
    try:
        if email.interval:
            interval = parse_interval(email)
            if interval:
                scheduler.add_job(
                    send_email,
                    DateTrigger(run_date=interval),
                    args=[email.id],
                    id=str(str(email.id) + "_interval")
                )
                print(f"[INTERVAL] Scheduled email {email.id} for {interval}")
            else:
                print(f"[INTERVAL] Email {email.id}'s interval is invalid")
        else:
            print(f"[INTERVAL] Email {email.id} has no interval")
    except Exception as e:
        print(f"[INTERVAL] Error scheduling email {email.id}: {e}")

def unschedule_email_send_time(email_id):
    try:
        job = scheduler.get_job(str(email_id))
        if job:
            scheduler.remove_job(str(email_id))
            print(f"[SEND TIME] Unscheduled email {email_id}")
        else:
            print(f"[SEND TIME] Email {email_id} not scheduled")
    except Exception as e:
        print(f"[SEND TIME] Error unscheduling email {email_id}: {e}")

def unschedule_email_interval(email_id):
    try:
        job = scheduler.get_job(str(email_id) + "_interval")
        if job:
            scheduler.remove_job(str(email_id) + "_interval")
            print(f"[INTERVAL] Unscheduled email {email_id} interval")
        else:
            print(f"[INTERVAL] Email {email_id} interval not scheduled")
    except Exception as e:
        print(f"[INTERVAL] Error unscheduling email {email_id}: {e}")

def reschedule_email_interval(email):
    if email.interval:
        unschedule_email_interval(email.id)
        schedule_email_interval(email)
    else:
        unschedule_email_interval(email.id)

def reschedule_email_send_time(email):
    if email.send_time:
        unschedule_email_send_time(email.id)
        schedule_email_send_time(email)
    else:
        unschedule_email_send_time(email.id)

def checkin(email):
    email.last_checkin = datetime.now()
    db.session.commit()
    reschedule_email_interval(email)

def init_scheduler():
    scheduler.start()
    emails = Emails.query.all()
    for email in emails:
        if email.send_time:
            schedule_email_send_time(email)
        if email.interval:
            schedule_email_interval(email)
        
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        init_scheduler()
    app.run(host='0.0.0.0', port=5000)