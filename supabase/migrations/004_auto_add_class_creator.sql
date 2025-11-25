-- Create a trigger to automatically add class creator to class_members
CREATE OR REPLACE FUNCTION auto_add_class_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the class creator as a teacher in class_members
  INSERT INTO class_members (class_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'teacher')
  ON CONFLICT (class_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after class insert
CREATE TRIGGER trigger_auto_add_class_creator
  AFTER INSERT ON classes
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_class_creator();

