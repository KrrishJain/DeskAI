CREATE OR REPLACE VIEW v_project_progress AS
SELECT
  p.id AS project_id,
  p.name AS project_name,
  COUNT(t.id) AS total_tasks,
  COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_tasks,
  COUNT(*) FILTER (WHERE t.status = 'todo') AS todo_tasks,
  COUNT(*) FILTER (WHERE t.status = 'doing') AS doing_tasks,
  ROUND(
    (COUNT(*) FILTER (WHERE t.status = 'completed')::numeric /
    NULLIF(COUNT(t.id),0)) * 100,
    2
  ) AS progress_pct
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.id
GROUP BY p.id;