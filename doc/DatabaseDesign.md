# Database Design

## Student

CREATE TABLE Student (
    NetID VARCHAR(20) PRIMARY KEY,
    Name VARCHAR(100),
    Expected_Graduation REAL,
    MajorID VARCHAR(50)
);

## Academic_Plan

CREATE TABLE Academic_Plan (
    PlanID INT PRIMARY KEY,
    CreationDate DATE,
    NetID VARCHAR(20),
    FOREIGN KEY (NetID) REFERENCES Student(NetID) ON DELETE SET NULL
);

## Course_Catalog

CREATE TABLE Course_Catalog (
    CourseID VARCHAR(20) PRIMARY KEY,
    Credits INT
);

## Planned_Course

CREATE TABLE Planned_Course (
    PlanID INT,
    CourseID VARCHAR(20),
    Semester VARCHAR(20),
    PRIMARY KEY (PlanID, CourseID),
    FOREIGN KEY (PlanID) REFERENCES Academic_Plan(PlanID) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Course_Catalog(CourseID) ON DELETE CASCADE
);

## Requirement

CREATE TABLE Requirement (
    RequirementID INT PRIMARY KEY,
    MajorID VARCHAR(50),
    Credits INT,
    CourseID VARCHAR(20),
    FOREIGN KEY (CourseID) REFERENCES Course_Catalog(CourseID) ON DELETE SET NULL
);

## AP_Credits

CREATE TABLE AP_Credits (
    NetID VARCHAR(20),
    CourseName VARCHAR(100),
    Score INT,
    CourseID VARCHAR(20),
    PRIMARY KEY (NetID, CourseName),
    FOREIGN KEY (NetID) REFERENCES Student(NetID) ON DELETE CASCADE,
    FOREIGN KEY (CourseID) REFERENCES Course_Catalog(CourseID) ON DELETE SET NULL
);

## Prerequisite

CREATE TABLE Prerequisite (
    CourseID VARCHAR(20),
    PrerequisiteID VARCHAR(20),
    PRIMARY KEY (CourseID, PrerequisiteID),
    FOREIGN KEY (CourseID) REFERENCES Course_Catalog(CourseID) ON DELETE CASCADE,
    FOREIGN KEY (PrerequisiteID) REFERENCES Course_Catalog(CourseID) ON DELETE CASCADE
);
