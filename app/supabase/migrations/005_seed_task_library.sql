-- HealthGuide Seed Task Library
-- Per healthguide-supabase/schema skill

-- ============================================
-- DEFAULT TASK SEEDING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION seed_agency_tasks(p_agency_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO task_library (agency_id, name, description, category, icon, estimated_duration_minutes) VALUES
  -- Companionship
  (p_agency_id, 'Companionship', 'Spend quality time with client', 'companionship', 'companionship', 30),
  (p_agency_id, 'Social Conversation', 'Engaging conversation and emotional support', 'companionship', 'companionship', 30),
  (p_agency_id, 'Reading Together', 'Read books, newspapers, or letters aloud', 'companionship', 'reading', 20),
  (p_agency_id, 'Games & Activities', 'Play cards, puzzles, or other activities', 'companionship', 'exercise', 30),

  -- Personal Care
  (p_agency_id, 'Bathing Assistance', 'Help with bathing or showering', 'personal_care', 'personalCare', 30),
  (p_agency_id, 'Grooming & Hygiene', 'Assist with grooming, hair care, shaving', 'personal_care', 'personalCare', 15),
  (p_agency_id, 'Dressing Assistance', 'Help with getting dressed', 'personal_care', 'personalCare', 15),
  (p_agency_id, 'Toileting Assistance', 'Assist with bathroom needs', 'personal_care', 'personalCare', 10),
  (p_agency_id, 'Oral Care', 'Assist with brushing teeth and dental hygiene', 'personal_care', 'personalCare', 10),

  -- Nutrition
  (p_agency_id, 'Meal Preparation', 'Prepare a nutritious meal', 'nutrition', 'meal', 45),
  (p_agency_id, 'Feeding Assistance', 'Assist with eating meals', 'nutrition', 'meal', 30),
  (p_agency_id, 'Snack Preparation', 'Prepare light snacks', 'nutrition', 'meal', 10),
  (p_agency_id, 'Hydration Reminder', 'Encourage and assist with fluid intake', 'nutrition', 'meal', 5),

  -- Medication
  (p_agency_id, 'Medication Reminder', 'Remind client to take medications', 'medication', 'medication', 5),
  (p_agency_id, 'Medication Organization', 'Organize pill boxes and medication schedule', 'medication', 'medication', 15),

  -- Mobility
  (p_agency_id, 'Transfer Assistance', 'Help with transfers (bed to chair, etc.)', 'mobility', 'mobility', 10),
  (p_agency_id, 'Walking Exercise', 'Accompany on walks, assist with mobility', 'mobility', 'mobility', 20),
  (p_agency_id, 'Range of Motion Exercises', 'Assist with prescribed exercises', 'mobility', 'exercise', 15),
  (p_agency_id, 'Position Changes', 'Reposition for comfort and prevention', 'mobility', 'mobility', 5),

  -- Housekeeping
  (p_agency_id, 'Light Housekeeping', 'Tidy up living areas, dust, vacuum', 'housekeeping', 'cleaning', 30),
  (p_agency_id, 'Laundry', 'Wash, dry, fold, and put away clothes', 'housekeeping', 'laundry', 30),
  (p_agency_id, 'Bed Making', 'Make and change beds', 'housekeeping', 'cleaning', 10),
  (p_agency_id, 'Dish Washing', 'Wash and put away dishes', 'housekeeping', 'cleaning', 15),
  (p_agency_id, 'Trash Removal', 'Take out trash and recycling', 'housekeeping', 'cleaning', 10),

  -- Transportation & Errands
  (p_agency_id, 'Escort to Appointment', 'Accompany to medical or other appointments', 'transportation', 'transport', 60),
  (p_agency_id, 'Grocery Shopping', 'Shop for groceries and household items', 'errands', 'errands', 45),
  (p_agency_id, 'Prescription Pickup', 'Pick up medications from pharmacy', 'errands', 'errands', 30),

  -- Vitals
  (p_agency_id, 'Vital Signs Check', 'Monitor and record vital signs', 'vitals', 'vitals', 10);

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AUTO-SEED TASKS FOR NEW AGENCIES
-- ============================================
CREATE OR REPLACE FUNCTION seed_new_agency_tasks()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM seed_agency_tasks(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER new_agency_tasks_trigger
AFTER INSERT ON agencies
FOR EACH ROW EXECUTE FUNCTION seed_new_agency_tasks();
