# Supabase Backend Deployment Instructions

This document provides instructions for deploying the necessary SQL functions and triggers for the MySchoo SaaS application.

## 1. Database Schema Setup

*   **Action:** Execute the SQL commands in `myschoo-saas-app/supabase/database_setup.sql`.
*   **How:**
    1.  Navigate to your Supabase project dashboard.
    2.  Go to the "SQL Editor" section.
    3.  Click on "+ New query".
    4.  Copy the entire content of `database_setup.sql` and paste it into the SQL editor.
    5.  Click "RUN".
*   **Verification:** Check that the tables (`tenants`, `user_profiles` (including `is_active` defaulting to `FALSE`), `grade_levels`, `students`, `parent_student_links`, `subjects`, `courses`, `course_periods`, `academic_years`, `marking_periods`, `student_enrollments`, `attendance_codes`, `attendance_records`, `assignment_types`, `assignments`, `student_grades`, `discipline_incident_types`, `discipline_incidents`, `fee_types`, `student_fees`, `student_payments`, `report_card_course_comments`) are created and RLS policies are active. Also verify the creation of helper functions like `get_current_tenant_id()`, `get_current_user_role()`, `is_parent_of_student()`, `get_student_id_for_user()`, and views like `student_account_balances_view`, `student_progress_report_view`, `attendance_summary_report_view`, `course_period_overall_grades_view`, and `report_card_data_view`. You can verify RLS status using the query at the end of `database_setup.sql`.

## 2. Deploy `handle_new_user` Function and Trigger

*   **Source File:** `myschoo-saas-app/supabase/functions/handle_new_user.sql`
*   **Action:** Execute the SQL code from this file in the Supabase SQL editor.
*   **How:**
    1.  Navigate to your Supabase project dashboard.
    2.  Go to the "SQL Editor" section.
    3.  Click on "+ New query".
    4.  Copy the entire content of `myschoo-saas-app/supabase/functions/handle_new_user.sql` and paste it into the SQL editor.
    5.  Click "RUN".
*   **Purpose:** This sets up a trigger that automatically creates a `user_profiles` record when a new user is added to `auth.users`. It handles both self-signups (creating a new tenant and assigning 'admin' role) and admin-invited users (assigning to the inviting admin's tenant with a specified role, using metadata from the invitation). For all new users, `is_active` in `user_profiles` defaults to `FALSE`. The trigger also populates `auth.users.raw_app_meta_data` with the final `tenant_id` and `role` for JWT claims and cleans up invitation-specific metadata.

## 3. Deploy Reporting and Grade Calculation Views

*   **Action:** Execute the SQL commands in the following files, in order, in the Supabase SQL editor.
*   **Files:**
    1.  `myschoo-saas-app/supabase/reports/student_progress_report_view.sql`
    2.  `myschoo-saas-app/supabase/reports/attendance_summary_report_view.sql`
    3.  `myschoo-saas-app/supabase/reports/course_period_overall_grades_view.sql`
    4.  `myschoo-saas-app/supabase/reports/report_card_data_view.sql`
*   **How:**
    1.  For each file, navigate to your Supabase project dashboard.
    2.  Go to the "SQL Editor" section.
    3.  Click on "+ New query".
    4.  Copy the entire content of the SQL file and paste it into the SQL editor.
    5.  Click "RUN".
*   **Purpose:** These views provide aggregated data for generating reports and calculating overall grades in the application.

## 4. Deploy `invite-user` Edge Function

*   **Source File:** `myschoo-saas-app/supabase/functions/invite-user/index.ts`
*   **Action:** Deploy this TypeScript code as a Supabase Edge Function.
*   **How (using Supabase CLI):**
    1.  Ensure you have the Supabase CLI installed and are logged into your Supabase account (`supabase login`).
    2.  Navigate to your local project directory that contains the `supabase` folder (e.g., `cd myschoo-saas-app`).
    3.  Run the deployment command:
        ```bash
        supabase functions deploy invite-user --no-verify-jwt
        ```
        (If your project is not linked, you might need `--project-ref YOUR_PROJECT_REF`).
*   **Environment Variables for the Edge Function:**
    *   In your Supabase project dashboard, go to "Edge Functions".
    *   Select the `invite-user` function.
    *   Go to its "Settings" or "Secrets" section.
    *   Add the following environment variables:
        *   `SUPABASE_URL`: Your project's Supabase URL (e.g., `https://<project_ref>.supabase.co`).
        *   `SUPABASE_SERVICE_ROLE_KEY`: Your project's `service_role` key (found in your project's API settings).
*   **Purpose:** This Edge Function allows tenant administrators to invite new staff members by email. It uses the `supabase.auth.admin.inviteUserByEmail()` method and passes the inviting admin's `tenant_id`, the specified `role` for the new user, and an optional `full_name` in the invitation data. This data is then used by the `handle_new_user` trigger to correctly populate the `user_profiles` table.

---
**Important Notes:**
*   Ensure the `user_profiles` table (created by `database_setup.sql`) and the `handle_new_user` function (from `handle_new_user.sql`) are in place *before* users start signing up or are invited. The `handle_new_user` function is now responsible for populating `raw_app_meta_data` which Supabase uses to put claims into the JWT.
*   The RLS policies in `database_setup.sql` and the conditions within the report views heavily rely on the `tenant_id` being present in the JWT's custom claims (specifically `app_metadata.tenant_id` which is derived from `raw_app_meta_data`). Verify this setup carefully.
---
