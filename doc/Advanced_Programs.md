## Transactions:
* Purpose: Ensures a student cannot register for more than 18 credits per semester
* Implementation:
DROP PROCEDURE IF EXISTS AddCourseWithValidation;

DELIMITER //

CREATE PROCEDURE AddCourseWithValidation(
    IN p_planid INT,
    IN p_courseid VARCHAR(20),
    IN p_semester VARCHAR(20),
    IN p_netid VARCHAR(20)
)
BEGIN
    DECLARE current_credits INT;
    DECLARE course_credits INT;
    DECLARE max_credits INT DEFAULT 18;
    
    -- Remove the SET TRANSACTION line and just start the transaction
    START TRANSACTION;
    
    SELECT COALESCE(SUM(cc.Credits), 0) INTO current_credits
    FROM Planned_Course pc
    JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
    WHERE pc.PlanID = p_planid AND pc.Semester = p_semester;
    
    SELECT Credits INTO course_credits
    FROM Course_Catalog
    WHERE CourseID = p_courseid;
    
    IF (current_credits + course_credits) > max_credits THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Adding this course would exceed maximum credits per semester';
        ROLLBACK;
    ELSE
        INSERT INTO Planned_Course(PlanID, CourseID, Semester)
        VALUES(p_planid, p_courseid, p_semester);
        
        COMMIT;
    END IF;
END //

DELIMITER ;


DELIMITER //

CREATE PROCEDURE SetIsolationAndAddCourse(
    IN p_planid INT,
    IN p_courseid VARCHAR(20),
    IN p_semester VARCHAR(20),
    IN p_netid VARCHAR(20)
)
BEGIN
    -- Set isolation level first
    SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
    
    -- Then call our existing procedure
    CALL AddCourseWithValidation(p_planid, p_courseid, p_semester, p_netid);
END //

## Stored Procedure with Cursor:
* Purpose: Analyzes a student's academic progress towards graduation
* Implementation:

CREATE PROCEDURE AnalyzeStudentProgress(
    IN p_netid VARCHAR(20)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE course_id VARCHAR(20);
    DECLARE course_credits INT;
    DECLARE total_credits INT DEFAULT 0;
    DECLARE courses_cursor CURSOR FOR
        SELECT pc.CourseID, cc.Credits
        FROM Planned_Course pc
        JOIN Academic_Plan ap ON pc.PlanID = ap.PlanID
        JOIN Course_Catalog cc ON pc.CourseID = cc.CourseID
        WHERE ap.NetID = p_netid;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table for analysis
    CREATE TEMPORARY TABLE IF NOT EXISTS progress_analysis (
        category VARCHAR(50),
        detail VARCHAR(100)
    );
    
    -- Open cursor
    OPEN courses_cursor;
    
    read_loop: LOOP
        FETCH courses_cursor INTO course_id, course_credits;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET total_credits = total_credits + course_credits;
        
        -- Insert course details into analysis
        INSERT INTO progress_analysis VALUES
        ('Course', CONCAT(course_id, ' (', course_credits, ' credits)'));
    END LOOP;
    
    -- Add summary information
    INSERT INTO progress_analysis VALUES
    ('Total Credits', CONCAT(total_credits, ' credits completed'));
    
    -- Check graduation eligibility (example threshold of 120 credits)
    IF total_credits >= 120 THEN
        INSERT INTO progress_analysis VALUES
        ('Status', 'Eligible for graduation');
    ELSE
        INSERT INTO progress_analysis VALUES
        ('Status', CONCAT('Needs ', 120 - total_credits, ' more credits for graduation'));
    END IF;
    
    -- Return results
    SELECT * FROM progress_analysis;
    
    -- Cleanup
    DROP TEMPORARY TABLE IF EXISTS progress_analysis;
    CLOSE courses_cursor;
END //


## Constraints
* Attribute-level Constraints:

valid_netid_format: Ensures NetID follows pattern (letters then numbers)

valid_graduation_year: Ensures graduation year is between 2020-2030


* Tuple-level Constraints:

valid_course_format: Ensures CourseID follows pattern (2-4 letters + 3 numbers)

prevent_time_conflict: Ensures no more than 6 courses per semester


ALTER TABLE Student 
ADD CONSTRAINT valid_netid_format 
CHECK (NetID REGEXP '^[a-z]+[0-9]+$');

* Ensures NetIDs follow correct pattern



ALTER TABLE Student 
ADD CONSTRAINT valid_graduation_semester 
CHECK (Expected_Graduation >= 0 AND Expected_Graduation <= 8);

* Keeps graduation timeline between 0-8 semesters




ALTER TABLE Course_Catalog 
ADD CONSTRAINT valid_course_format 
CHECK (CourseID REGEXP '^[A-Z]{2,4}(-[0-9]{3}|[0-9]{2,3})$');

* Ensures course IDs match your format (ETMA-100 or MUS90 style)




DELIMITER ;


## Triggers:

* Show prereqs not fulfilled
* implementation:

DELIMITER //

CREATE TRIGGER prevent_time_conflict
BEFORE INSERT ON Planned_Course
FOR EACH ROW
BEGIN
    DECLARE existing_courses INT;
    
    SELECT COUNT(*) INTO existing_courses
    FROM Planned_Course pc
    WHERE pc.PlanID = NEW.PlanID 
    AND pc.Semester = NEW.Semester;
    
    IF existing_courses >= 6 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot enroll in more than 6 courses per semester';
    END IF;
END //

DELIMITER ;

-- 1. First let's try adding the Course_Catalog constraint
ALTER TABLE Course_Catalog 
ADD CONSTRAINT valid_course_format 
CHECK (CourseID REGEXP '^[A-Z]{2,5}[0-9]{3}$');