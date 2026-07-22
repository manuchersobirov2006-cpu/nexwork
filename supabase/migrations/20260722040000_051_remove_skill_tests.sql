/*
# Remove skill tests

Feature reverted per product decision — badges will be paid-only instead.
*/

DROP FUNCTION IF EXISTS submit_skill_test(uuid, jsonb);
DROP TABLE IF EXISTS skill_test_results;
DROP TABLE IF EXISTS skill_test_answers;
DROP TABLE IF EXISTS skill_tests;
