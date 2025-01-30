from flask import Flask, jsonify, request, g
from flask_cors import CORS
import os
import mysql.connector
from mysql.connector import IntegrityError, errorcode
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(BASE_DIR, '../../doc/sqlite_dump.sql')

# MySQL configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '123456',
    'database': 'curriculum',
    # 'raise_on_warnings': True
}

def get_db():
    if 'db' not in g:
        g.db = mysql.connector.connect(**DB_CONFIG)
    return g.db

@app.teardown_appcontext
def close_db(exception):
    """
    Closes the database again at the end of the request.
    """
    db = g.pop('db', None)
    if db is not None:
        db.close()

def execute_query(query, args=(), one=False, commit=False):
    """
    Helper function to execute a database query.
    """
    try:
        conn = get_db()
        if not conn:
            raise Exception("Could not establish database connection")
            
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, args)

        if commit:
            conn.commit()
            cursor.close()
            return None

        if one:
            result = cursor.fetchone()
        else:
            result = cursor.fetchall()
            
        cursor.close()
        return result
        
    except mysql.connector.Error as err:
        print(f"Database error in execute_query: {err}")
        raise
    except Exception as e:
        print(f"Unexpected error in execute_query: {e}")
        raise

def execute_transaction(queries):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        for query, args in queries:
            cursor.execute(query, args)
        conn.commit()
        return cursor.fetchall()
    except Exception as e:
        conn.rollback()
        print(f"Transaction failed: {e}")
        raise
    finally:
        cursor.close()

@app.route('/')
def home():
    return "Flask server is running!"

def create_bypass_log_table():
    try:
        query = """
        CREATE TABLE IF NOT EXISTS Prerequisite_Bypass_Log (
            BypassID INT PRIMARY KEY AUTO_INCREMENT,
            NetID VARCHAR(20),
            CourseID VARCHAR(20),
            PlanID INT,
            BypassReason VARCHAR(255),
            BypassDate DATETIME,
            FOREIGN KEY (NetID) REFERENCES Student(NetID),
            FOREIGN KEY (CourseID) REFERENCES Course_Catalog(CourseID),
            FOREIGN KEY (PlanID) REFERENCES Academic_Plan(PlanID)
        )
        """
        execute_query(query, commit=True)
        print("Prerequisite_Bypass_Log table created successfully")
    except Exception as e:
        print(f"Error creating Prerequisite_Bypass_Log table: {str(e)}")

def init_db():
    """
    Initializes the database by creating tables from schema.sql if the database doesn't exist.
    """
    try:
        # Connect to MySQL server
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = conn.cursor()

        # Check if the database exists
        cursor.execute("SHOW DATABASES;")
        databases = [db[0] for db in cursor.fetchall()]
        if DB_CONFIG['database'] not in databases:
            # Create the database
            cursor.execute(f"CREATE DATABASE {DB_CONFIG['database']};")
            print(f"Database '{DB_CONFIG['database']}' created.")
        else:
            print(f"Database '{DB_CONFIG['database']}' already exists.")

        # Use the database
        conn.database = DB_CONFIG['database']

        # Initialize schema
        with open(SCHEMA_PATH, 'r') as f:
            schema = f.read()
            for statement in schema.split(';'):  # Execute each statement
                if statement.strip():
                    # try:
                        cursor.execute(statement)
                    # except mysql.connector.Error as err:
                        # Only print error and continue, don't stop execution
                        # print(f"Error executing statement: {err}")
            conn.commit()

        print("Schema initialized.")

    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Access denied: Check your username or password.")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist, and creation failed.")
        else:
            print(f"Error: {err}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()


init_db()
# ensure_ap_credits_data()
create_bypass_log_table()

@app.route('/api/students', methods=['GET'])
def get_students():
    query = "SELECT * FROM Student"
    students = execute_query(query)
    return jsonify(students)

@app.route('/api/courses', methods=['GET'])
def get_courses():
    try:
        print("Attempting to fetch courses...")  # Debug print
        courses = execute_query("SELECT * FROM Course_Catalog")
        print(f"Retrieved {len(courses)} courses")  # Debug print
        return jsonify(courses)
    except Exception as e:
        print(f"Error in get_courses: {str(e)}")  # Debug print
        return jsonify({"error": str(e)}), 500


@app.route('/api/ap-course-mapping', methods=['GET'])
def get_ap_course_mapping():
    try:
        course_name = request.args.get('courseName')
        score = request.args.get('score')
        
        print(f"Received request - Course: {course_name}, Score: {score}")
        
        if not course_name or not score:
            return jsonify({
                "error": "Course name and score are required"
            }), 400

        try:
            score = int(score)
        except ValueError:
            return jsonify({
                "error": "Invalid score format"
            }), 400

        # Modified query to fix the DISTINCT/ORDER BY issue
        query = """
        SELECT CourseID, Score
        FROM AP_Credits 
        WHERE UPPER(CourseName) = UPPER(%s) 
        AND Score <= %s 
        ORDER BY Score DESC 
        LIMIT 1
        """
        
        print(f"Executing query with params: {course_name}, {score}")
        result = execute_query(query, (course_name, score), one=True)
        print(f"Query result: {result}")

        if result:
            return jsonify({
                "CourseID": result['CourseID']
            })
        else:
            return jsonify({
                "message": "No course credit available for this AP score"
            }), 404

    except Exception as e:
        print(f"Exception details: {type(e).__name__}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({
            "error": f"Server error: {str(e)}"
        }), 500
    
# Add a test endpoint to check AP_Credits table content
@app.route('/api/ap-credits/debug', methods=['GET'])
def debug_ap_credits():
    """
    Debug endpoint to check AP_Credits table content
    """
    try:
        query = "SELECT * FROM AP_Credits"
        results = execute_query(query)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/ap-courses', methods=['GET'])
def get_unique_ap_courses():
    print("Fetching unique AP courses...")  # Debug print
    query = """
    SELECT DISTINCT CourseName 
    FROM AP_Credits 
    ORDER BY CourseName
    """
    try:
        courses = execute_query(query)
        print(f"Found AP courses: {courses}")  # Debug print
        return jsonify(courses)
    except Exception as e:
        print(f"Error fetching AP courses: {str(e)}")  # Debug print
        return jsonify({"error": str(e)}), 500

@app.route('/api/student/<netid>/plans', methods=['GET'])
def get_student_plans(netid):
    query = """
        SELECT PlanID, CreationDate, NetID
        FROM Academic_Plan
        WHERE NetID IS NOT NULL AND LOWER(NetID) = LOWER(%s)
    """
    plans = execute_query(query, (netid,))
    if not plans:
        return jsonify({"error": "No academic plans found for this student"}), 404
    return jsonify(plans)

@app.route('/api/plan/<int:planid>', methods=['GET'])
def get_plan(planid):
    query = """
        SELECT pc.PlanID, pc.CourseID, pc.Semester, cc.Credits
        FROM Planned_Course pc
        JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
        WHERE pc.PlanID = %s
    """
    courses = execute_query(query, (planid,))
    return jsonify(courses)

@app.route('/api/majors', methods=['GET'])
def get_majors():
    query = "SELECT DISTINCT MajorID FROM Requirement"
    majors = execute_query(query)
    return jsonify(majors)

@app.route('/api/course/<courseid>/prerequisites', methods=['GET'])
def get_prerequisites(courseid):
    query = """
        SELECT p.CourseID, p.PrerequisiteID, c.Credits AS PrerequisiteCredits
        FROM Prerequisite p
        JOIN Course_Catalog c ON p.PrerequisiteID = c.CourseID
        WHERE p.CourseID = %s
    """
    prerequisites = execute_query(query, (courseid,))
    return jsonify(prerequisites)

@app.route('/api/create-account', methods=['POST'])
def create_account():
    data = request.get_json()
    name = data.get('name')
    netid = data.get('netid')
    major = data.get('majorid')
    graduation = data.get('egrad')

    if not all([name, netid, major, graduation]):
        return jsonify({"error": "All fields are required"}), 400

    existing_student = execute_query(
        "SELECT * FROM Student WHERE NetID = %s",
        (netid,),
        one=True
    )

    if existing_student:
        return jsonify({"error": "Account with this NetID already exists"}), 409

    try:
        execute_query(
            "INSERT INTO Student (NetID, Name, Expected_Graduation, MajorID) VALUES (%s, %s, %s, %s)",
            (netid, name, graduation, major),
            commit=True
        )
        return jsonify({"message": "Account created successfully"}), 201
    except IntegrityError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# Call this function after your database initialization


@app.route('/api/login', methods=['POST'])
def login():
    """
    Validate login credentials by checking the Student table.
    """
    data = request.get_json()
    netid = data.get('netid')
    name = data.get('name')

    if not all([netid, name]):
        return jsonify({"error": "NetID and Name are required"}), 400

    user = execute_query(
        "SELECT * FROM Student WHERE NetID = %s AND Name = %s",
        (netid, name),
        one=True
    )

    if user:
        return jsonify({"message": "Login successful!", "user": user}), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/courses/search', methods=['GET'])
def search_courses():
    search_term = request.args.get('q', '').lower()
    query = """
        SELECT CourseID 
        FROM Course_Catalog 
        WHERE LOWER(CourseID) LIKE %s
        LIMIT 50
    """
    courses = execute_query(query, (f"%{search_term}%",))
    return jsonify(courses)

@app.route('/api/course/<courseid>/prerequisite-graph', methods=['GET'])
def get_prerequisite_graph(courseid):
    """
    Recursively fetch all prerequisites and construct graph data.
    """
    def fetch_prerequisites(courseid, visited):
        if courseid in visited:
            return []
        visited.add(courseid)
        query = """
            SELECT p.CourseID, p.PrerequisiteID
            FROM Prerequisite p
            WHERE p.CourseID = %s
        """
        prerequisites = execute_query(query, (courseid,))
        edges = [{"from": prereq["PrerequisiteID"], "to": prereq["CourseID"]} for prereq in prerequisites]
        for prereq in prerequisites:
            edges.extend(fetch_prerequisites(prereq["PrerequisiteID"], visited))
        return edges

    visited = set()
    graph_edges = fetch_prerequisites(courseid, visited)
    nodes = [{"id": course, "label": course} for course in visited]
    return jsonify({"nodes": nodes, "edges": graph_edges})

@app.route('/api/update-account', methods=['PUT'])
def update_account():
    data = request.get_json()
    netid = data.get('netid')
    name = data.get('name')
    major = data.get('majorid')
    graduation = data.get('egrad')

    if not netid:
        return jsonify({"error": "NetID is required for updating information"}), 400

    try:
        existing_student = execute_query(
            "SELECT * FROM Student WHERE NetID = %s",
            (netid,),
            one=True
        )

        if not existing_student:
            return jsonify({"error": "Account with this NetID does not exist"}), 404

        execute_query(
            """
            UPDATE Student
            SET Name = %s, MajorID = %s, Expected_Graduation = %s
            WHERE NetID = %s
            """,
            (name or existing_student["Name"], major or existing_student["MajorID"],
             graduation or existing_student["Expected_Graduation"], netid),
            commit=True
        )
        return jsonify({"message": "Information updated successfully"}), 200
    except IntegrityError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/plan', methods=['POST'])
def add_plan():
    data = request.get_json()
    netid = data.get('netid')

    if not netid:
        return jsonify({"error": "NetID is required"}), 400

    try:
        # Find the lowest available PlanID
        query = "SELECT MAX(PlanID) AS max_planid FROM Academic_Plan"
        result = execute_query(query, one=True)
        max_planid = result["max_planid"] if result["max_planid"] is not None else 0
        new_planid = max_planid + 1

        # Add the new plan with only the date
        execute_query(
            "INSERT INTO Academic_Plan (PlanID, CreationDate, NetID) VALUES (%s, DATE(NOW()), %s)",
            (new_planid, netid),
            commit=True
        )
        return jsonify({"message": f"Plan added successfully with PlanID {new_planid}.", "planid": new_planid}), 201
    except IntegrityError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@app.route('/api/course', methods=['POST'])
def add_course():
    data = request.get_json()
    planid = data.get('planid')
    courseid = data.get('courseid').strip().upper()  # Ensure uppercase
    semester = data.get('semester').strip().upper()  # Ensure uppercase

    print(f"Received payload: PlanID={planid}, CourseID={courseid}, Semester={semester}")

    if not all([planid, courseid, semester]):
        return jsonify({"error": "All fields (planid, courseid, semester) are required"}), 400

    try:
        # Check if the PlanID exists
        plan_exists = execute_query("SELECT 1 FROM Academic_Plan WHERE PlanID = %s", (planid,), one=True)
        print(f"Plan exists check: {plan_exists}")
        if not plan_exists:
            return jsonify({"error": f"PlanID {planid} does not exist"}), 404

        # Check if CourseID exists
        course_exists = execute_query("SELECT 1 FROM Course_Catalog WHERE LOWER(CourseID) = LOWER(%s)", (courseid,), one=True)
        print(f"Course exists check: {course_exists}")
        if not course_exists:
            return jsonify({"error": f"CourseID {courseid} does not exist in Course_Catalog"}), 404

        # Check for duplicate entries
        duplicate_check = execute_query(
            "SELECT 1 FROM Planned_Course WHERE PlanID = %s AND CourseID = %s",
            (planid, courseid),
            one=True
        )
        print(f"Duplicate entry check: {duplicate_check}")
        if duplicate_check:
            return jsonify({"error": f"Course {courseid} is already added to PlanID {planid}"}), 409

        # Add the course
        execute_query(
            "INSERT INTO Planned_Course (PlanID, CourseID, Semester) VALUES (%s, %s, %s)",
            (planid, courseid, semester),
            commit=True
        )
        print("Course added successfully")
        return jsonify({"message": f"Course {courseid} added to PlanID {planid} successfully"}), 201
    except IntegrityError as e:
        print(f"Database error: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@app.route('/api/plan/<int:planid>', methods=['DELETE'])
def delete_plan(planid):
    try:
        execute_query("DELETE FROM Academic_Plan WHERE PlanID = %s", (planid,), commit=True)
        return jsonify({"message": "Plan deleted successfully"}), 200
    except IntegrityError as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    
@app.route('/api/plan/<int:planid>/course/<courseid>', methods=['DELETE'])
def delete_course(planid, courseid):
    try:
        print(f"Attempting to delete CourseID={courseid.upper()} from PlanID={planid}")
        
        execute_query(
            "DELETE FROM Planned_Course WHERE PlanID = %s AND LOWER(CourseID) = LOWER(%s)",
            (planid, courseid),
            commit=True
        )
        
        print("Delete operation executed successfully.")
        return jsonify({"message": f"Course {courseid} removed from PlanID {planid} successfully"}), 200
    except IntegrityError as e:
        print(f"Database error: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500

# from flask import Flask, request, jsonify

# app = Flask(__name__)
# Add this after your existing imports

#For semester credits calculation
@app.route('/api/plan/<int:planid>/semester-credits/<semester>', methods=['GET'])
def get_semester_credits(planid, semester):
    """
    Calculate total credits for a specific semester in a plan
    """
    query = """
    SELECT COALESCE(SUM(cc.Credits), 0) as total_credits
    FROM Planned_Course pc
    JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
    WHERE pc.PlanID = %s AND UPPER(pc.Semester) = UPPER(%s)
    """
    try:
        result = execute_query(query, (planid, semester), one=True)
        return jsonify({
            'total_credits': result['total_credits'] if result else 0
        })
    except Exception as e:
        print(f"Error getting semester credits: {str(e)}")
        return jsonify({'error': str(e)}), 500

#For prerequisite checking
@app.route('/api/course/prerequisites/<courseid>', methods=['GET'])
def check_prerequisites(courseid):
    """
    Check prerequisites for a course and return missing ones
    """
    try:
        # Get all prerequisites for the course
        prereq_query = """
        SELECT PrerequisiteID 
        FROM Prerequisite 
        WHERE CourseID = %s
        """
        prerequisites = execute_query(prereq_query, (courseid,))
        
        # If no prerequisites, return empty list
        if not prerequisites:
            return jsonify({'missingPrerequisites': []})

        prereq_ids = [p['PrerequisiteID'] for p in prerequisites]
        
        return jsonify({
            'missingPrerequisites': prereq_ids
        })
    except Exception as e:
        print(f"Error checking prerequisites: {str(e)}")
        return jsonify({'error': str(e)}), 500

#For course addition with validation
@app.route('/api/course/add-with-validation', methods=['POST'])
def add_course_with_validation():
    """
    Add a course using stored procedure with validation
    """
    data = request.get_json()
    planid = data.get('planid')
    courseid = data.get('courseid')
    semester = data.get('semester')
    netid = data.get('netid')
    
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        
        # Call the stored procedure
        cursor.callproc('AddCourseWithValidation', [planid, courseid, semester, netid])
        conn.commit()
        
        return jsonify({'message': 'Course added successfully'}), 201
        
    except mysql.connector.Error as e:
        if e.errno == 1644:  # Custom error from stored procedure
            return jsonify({'error': str(e)}), 400
        print(f"Error adding course: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()

@app.route('/api/course/add-with-bypass', methods=['POST'])
def add_course_with_bypass():
    """
    Add a course bypassing prerequisites but still maintaining credit limits
    """
    data = request.get_json()
    planid = data.get('planid')
    courseid = data.get('courseid')
    semester = data.get('semester')
    bypass_reason = data.get('bypassReason')
    netid = data.get('netid')
    
    try:
        # First check semester credit total
        credit_query = """
        SELECT COALESCE(SUM(cc.Credits), 0) as current_credits,
               (SELECT Credits FROM Course_Catalog WHERE CourseID = %s) as new_credits
        FROM Planned_Course pc
        JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
        WHERE pc.PlanID = %s AND UPPER(pc.Semester) = UPPER(%s)
        """
        
        result = execute_query(credit_query, (courseid, planid, semester), one=True)
        current_credits = result['current_credits']
        new_credits = result['new_credits']
        
        # Check if adding this course would exceed 18 credits
        if current_credits + new_credits > 18:
            return jsonify({
                'error': 'Adding this course would exceed the maximum credits (18) for the semester'
            }), 400

        # Check number of courses in semester
        count_query = """
        SELECT COUNT(*) as course_count
        FROM Planned_Course
        WHERE PlanID = %s AND UPPER(Semester) = UPPER(%s)
        """
        count_result = execute_query(count_query, (planid, semester), one=True)
        
        if count_result['course_count'] >= 6:
            return jsonify({
                'error': 'Cannot add more than 6 courses per semester'
            }), 400

        # Log the prerequisite bypass
        log_query = """
        INSERT INTO Prerequisite_Bypass_Log 
        (NetID, CourseID, PlanID, BypassReason, BypassDate) 
        VALUES (%s, %s, %s, %s, NOW())
        """
        execute_query(log_query, (netid, courseid, planid, bypass_reason), commit=True)

        # Add the course
        add_query = """
        INSERT INTO Planned_Course (PlanID, CourseID, Semester)
        VALUES (%s, %s, %s)
        """
        execute_query(add_query, (planid, courseid, semester), commit=True)
        
        return jsonify({'message': 'Course added successfully with prerequisite bypass'}), 201
        
    except Exception as e:
        print(f"Error adding course with bypass: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/students/total-credits/<netid>', methods=['GET'])
def get_total_credits(netid):
    planid = request.args.get('planid')  # Get planID from query params
    
    if planid:
        # Query for specific plan's total credits
        query = """
        SELECT ap.PlanID,
               s.NetID,
               s.Name,
               COALESCE(SUM(cc.Credits), 0) AS Total_Planned_Credits
        FROM Academic_Plan ap
        JOIN Student s ON ap.NetID = s.NetID
        LEFT JOIN Planned_Course pc ON ap.PlanID = pc.PlanID
        LEFT JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
        WHERE s.NetID = %s AND ap.PlanID = %s
        GROUP BY ap.PlanID, s.NetID, s.Name
        """
        try:
            result = execute_query(query, (netid, planid), one=True)
            if result:
                return jsonify({
                    "netid": result['NetID'],
                    "total_credits": result['Total_Planned_Credits'],
                    "message": f"Hey {result['NetID']}, you have a grand total of {result['Total_Planned_Credits']} credits planned in this plan!"
                })
            return jsonify({
                "netid": netid,
                "total_credits": 0,
                "message": f"Hey {netid}, you don't have any credits planned in this plan yet!"
            })
        except Exception as e:
            print(f"Failed to fetch total credits: {e}")
            return jsonify({"error": f"Failed to fetch total credits"}), 500

@app.route('/api/students/requirements/<netid>', methods=['GET'])
def find_students_fulfilling_requirements(netid):
    try:
        # Get student's major
        student_query = "SELECT MajorID FROM Student WHERE NetID = %s"
        student_result = execute_query(student_query, (netid,), one=True)
        
        if not student_result:
            return jsonify({"error": "Student not found"}), 404
            
        major_id = student_result['MajorID']
        
        # Get fulfilled requirements
        fulfilled_query = """
        SELECT DISTINCT r.CourseID, r.Credits
        FROM Student s
        JOIN Academic_Plan ap ON s.NetID = ap.NetID
        JOIN Planned_Course pc ON ap.PlanID = pc.PlanID
        JOIN Requirement r ON r.CourseID = pc.CourseID
        WHERE r.MajorID = s.MajorID AND s.NetID = %s
        """
        
        # Get all requirements for the major
        all_requirements_query = """
        SELECT CourseID, Credits
        FROM Requirement
        WHERE MajorID = %s
        """
        
        fulfilled_results = execute_query(fulfilled_query, (netid,))
        all_requirements = execute_query(all_requirements_query, (major_id,))
        
        # Create set of fulfilled course IDs
        fulfilled_course_ids = {course['CourseID'] for course in fulfilled_results}
        
        # Separate unfulfilled requirements
        unfulfilled = [
            course for course in all_requirements 
            if course['CourseID'] not in fulfilled_course_ids
        ]
        
        return jsonify({
            "majorId": major_id,
            "fulfilled": fulfilled_results,
            "unfulfilled": unfulfilled
        })
        
    except Exception as e:
        print(f"Error fetching requirements: {str(e)}")
        return jsonify({"error": str(e)}), 500

#analyze a student's progress:
# Add this to your server.py
@app.route('/api/student/progress/<netid>', methods=['GET'])
def analyze_student_progress(netid):
    try:
        # Call the stored procedure
        cursor = get_db().cursor(dictionary=True)
        cursor.callproc('AnalyzeStudentProgress', [netid])
        
        # Get basic progress data
        basic_progress = cursor.fetchall()
        cursor.nextset()  # Move to next result set if any
        
        # Get additional analysis data
        additional_analysis = []
        
        # Get major requirements progress
        req_query = """
        SELECT r.CourseID, r.Credits,
               CASE WHEN pc.CourseID IS NOT NULL THEN 'Completed' ELSE 'Pending' END as Status
        FROM Requirement r
        JOIN Student s ON r.MajorID = s.MajorID
        LEFT JOIN Academic_Plan ap ON s.NetID = ap.NetID
        LEFT JOIN Planned_Course pc ON ap.PlanID = pc.PlanID AND r.CourseID = pc.CourseID
        WHERE s.NetID = %s
        """
        cursor.execute(req_query, (netid,))
        requirements = cursor.fetchall()
        
        # Calculate requirements progress
        total_req = len(requirements)
        completed_req = len([r for r in requirements if r['Status'] == 'Completed'])
        
        additional_analysis.append({
            'category': 'Requirements Progress',
            'detail': f'Completed {completed_req} out of {total_req} required courses'
        })

        # Get semester-wise progress
        sem_query = """
        SELECT pc.Semester, COUNT(*) as CourseCount, SUM(cc.Credits) as Credits
        FROM Academic_Plan ap
        JOIN Planned_Course pc ON ap.PlanID = pc.PlanID
        JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
        WHERE ap.NetID = %s
        GROUP BY pc.Semester
        ORDER BY pc.Semester
        """
        cursor.execute(sem_query, (netid,))
        semester_progress = cursor.fetchall()
        
        for sem in semester_progress:
            additional_analysis.append({
                'category': f'Semester {sem["Semester"]}',
                'detail': f'{sem["CourseCount"]} courses, {sem["Credits"]} credits'
            })

        # Get expected graduation
        grad_query = "SELECT Expected_Graduation FROM Student WHERE NetID = %s"
        cursor.execute(grad_query, (netid,))
        grad_info = cursor.fetchone()
        
        if grad_info:
            additional_analysis.append({
                'category': 'Expected Graduation',
                'detail': f'After {grad_info["Expected_Graduation"]} semesters'
            })

        # Combine all analysis
        complete_analysis = basic_progress + additional_analysis
        
        cursor.close()
        return jsonify(complete_analysis)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True)