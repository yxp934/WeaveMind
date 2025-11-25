-- Make the trigger truly idempotent by checking if record exists first
CREATE OR REPLACE FUNCTION auto_add_class_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if the record doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM class_members 
    WHERE class_id = NEW.id AND user_id = NEW.created_by
  ) THEN
    INSERT INTO class_members (class_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'teacher');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

