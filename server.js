const express = require('express');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. MySQL Database Connection Pool (Cloud Aiven Database)
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10
});

// Test Database Connection & Auto-Create Table
db.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Connected to MySQL database successfully!');
        
        // Auto-create the students table if it doesn't exist yet
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50) NOT NULL,
                gender VARCHAR(50) NOT NULL,
                state VARCHAR(100) NOT NULL,
                track VARCHAR(255) NOT NULL,
                experience_level VARCHAR(100) NOT NULL,
                status VARCHAR(50) DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;
        
        connection.query(createTableQuery, (tableErr) => {
            connection.release();
            if (tableErr) {
                console.error('❌ Failed to create students table:', tableErr.message);
            } else {
                console.log('✅ Students table verified/created successfully in database!');
            }
        });
    }
});

// 2. Nodemailer Email Transporter Configuration
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify SMTP Connection
transporter.verify((error) => {
    if (error) {
        console.error('❌ SMTP Configuration Error:', error.message);
    } else {
        console.log('✅ Mail server is ready to send messages');
    }
});

// -------------------------------------------------------------
// ENDPOINT 1: Student Registration (POST /api/register)
// -------------------------------------------------------------
app.post('/api/register', (req, res) => {
    const { full_name, email, phone, gender, state, track, experience_level } = req.body;

    if (!full_name || !email || !phone || !gender || !state || !track) {
        return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const sqlInsert = `INSERT INTO students (full_name, email, phone, gender, state, track, experience_level) VALUES (?, ?, ?, ?, ?, ?, ?)`;

    db.query(sqlInsert, [full_name, email, phone, gender, state, track, experience_level || 'Beginner'], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'This email address is already registered.' });
            }
            console.error('Database Error:', err);
            return res.status(500).json({ error: 'Database error occurred during registration.' });
        }

        const studentId = result.insertId;

        // Send instant notification email to Admin
        const adminMailOptions = {
            from: `"AMAGix Portal" <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
            subject: `🚨 New Student Registration: ${full_name}`,
            html: `
                <h2>New Student Application Received</h2>
                <p><strong>Name:</strong> ${full_name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Gender:</strong> ${gender}</p>
                <p><strong>State:</strong> ${state}</p>
                <p><strong>Selected Track:</strong> ${track}</p>
                <p><strong>Experience Level:</strong> ${experience_level || 'Beginner'}</p>
                <hr />
                <p>Status is currently set to <strong>PENDING</strong> in your database.</p>
            `
        };

        transporter.sendMail(adminMailOptions, (mailErr) => {
            if (mailErr) {
                console.error('Admin Email Dispatch Error:', mailErr);
            }
        });

        res.status(201).json({
            message: 'Registration successful! Your application has been submitted for review.',
            studentId
        });
    });
});

// -------------------------------------------------------------
// ENDPOINT 2: Admin Login (POST /api/admin/login)
// -------------------------------------------------------------
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        return res.status(200).json({ success: true, token: 'amagix-authenticated-session' });
    }

    return res.status(401).json({ error: 'Invalid admin username or password.' });
});

// Middleware to protect admin routes
const requireAdminAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader === 'Bearer amagix-authenticated-session') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized access.' });
    }
};

// -------------------------------------------------------------
// ENDPOINT 3: Fetch All Students (GET /api/admin/students)
// -------------------------------------------------------------
app.get('/api/admin/students', requireAdminAuth, (req, res) => {
    const sql = 'SELECT * FROM students ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ error: 'Failed to retrieve students list.' });
        }
        res.status(200).json(results);
    });
});

// -------------------------------------------------------------
// ENDPOINT 4: Admin Approval & Student Acknowledgement (POST /api/admin/approve/:id)
// -------------------------------------------------------------
app.post('/api/admin/approve/:id', requireAdminAuth, (req, res) => {
    const studentId = req.params.id;

    db.query('SELECT * FROM students WHERE id = ?', [studentId], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: 'Student record not found.' });
        }

        const student = results[0];

        db.query('UPDATE students SET status = "APPROVED" WHERE id = ?', [studentId], (updateErr) => {
            if (updateErr) {
                console.error('❌ Database Update Failed:', updateErr);
                return res.status(500).json({ error: 'Failed to update student status.' });
            }

            const studentMailOptions = {
                from: `"AMAGix Technologies Admissions" <${process.env.SMTP_USER}>`,
                to: student.email,
                subject: `Application Approved & Interview Invitation - ${student.track}`,
                text: `Congratulations, ${student.full_name}!\n\nWe are pleased to inform you that your application for the ${student.track} track at AMAGix Technologies has been reviewed and approved.\n\nNext Steps:\n1. Interview & Screening: Please contact our admissions desk or reply directly to this email to confirm your interview and screening schedule.\n2. Registration & Tuition: Tuition fee schedules, curriculum details, and onboarding packages will be finalized during your session.\n\nWe look forward to welcoming you to the AMAGix learning community!\n\nBest regards,\nAMAGix Admissions Team\nAMAGix Technologies`,
                html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Approved - AMAGix Technologies</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0B1120; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #111C2E; border-radius: 14px; border: 1px solid #1E293B; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.5);">
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #0284C7 0%, #38BDF8 100%);"></td>
          </tr>
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 32px 32px 20px; border-bottom: 1px solid #1E293B;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #F8FAFC; letter-spacing: -0.5px;">AMAGix Technologies</h1>
                    <p style="margin: 4px 0 0; font-size: 13px; color: #38BDF8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Admissions & Technical Training</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #F8FAFC;">
                Congratulations, ${student.full_name}!
              </h2>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #CBD5E1;">
                We are pleased to inform you that your application for the <strong style="color: #38BDF8;">${student.track}</strong> track at <strong>AMAGix Technologies</strong> has been reviewed and <strong style="color: #34D399;">approved</strong>.
              </p>

              <!-- Candidate Summary Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0B1120; border-radius: 10px; border: 1px solid #1E293B; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13px; color: #94A3B8;">
                      <tr>
                        <td style="padding: 5px 0; width: 130px;"><strong>Applicant:</strong></td>
                        <td style="padding: 5px 0; color: #F8FAFC; font-weight: 600;">${student.full_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;"><strong>Enrolled Track:</strong></td>
                        <td style="padding: 5px 0; color: #38BDF8; font-weight: 600;">${student.track}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;"><strong>Experience Level:</strong></td>
                        <td style="padding: 5px 0; color: #F8FAFC;">${student.experience_level || 'Beginner'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0;"><strong>Status:</strong></td>
                        <td style="padding: 5px 0;">
                          <span style="display: inline-block; background-color: rgba(34, 197, 94, 0.15); color: #34D399; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700;">APPROVED</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next Steps Section -->
              <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #F8FAFC;">
                Next Steps to Complete Enrollment:
              </h3>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin-bottom: 24px;">
                <tr>
                  <td valign="top" style="padding: 6px 10px 6px 0; color: #38BDF8; font-weight: bold;">1.</td>
                  <td style="padding: 6px 0;">
                    <strong style="color: #F8FAFC;">Interview & Screening:</strong> Please contact our admissions desk or reply directly to this email to confirm your interview and screening schedule.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="padding: 6px 10px 6px 0; color: #38BDF8; font-weight: bold;">2.</td>
                  <td style="padding: 6px 0;">
                    <strong style="color: #F8FAFC;">Registration & Tuition:</strong> Fee structures, schedules, and payment validation steps will be shared during your interview session.
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                We look forward to welcoming you to our learning community and accelerating your tech career!
              </p>

              <!-- Sign-off -->
              <p style="margin: 0; font-size: 14px; color: #CBD5E1;">
                Warm regards,<br />
                <strong style="color: #F8FAFC;">AMAGix Admissions Team</strong><br />
                <span style="font-size: 12px; color: #64748B;">AMAGix Technologies</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0B1120; border-top: 1px solid #1E293B; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                This is an official admissions communication from AMAGix Technologies.<br />
                If you did not apply for this program, please ignore this email or contact support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
                `
            };

            transporter.sendMail(studentMailOptions, (mailErr, info) => {
                if (mailErr) {
                    console.error('❌ Student Email Dispatch Failed:', mailErr);
                    return res.status(200).json({ 
                        message: `Student ${student.full_name} approved successfully (Note: Email dispatch encountered an issue).` 
                    });
                }

                console.log('✅ Student Approval Email Sent:', info.response);
                return res.status(200).json({ 
                    message: `Student ${student.full_name} approved and acknowledgement email sent!` 
                });
            });
        });
    });
});

// -------------------------------------------------------------
// Server Initialization
// -------------------------------------------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running live on http://localhost:${PORT}`);
});