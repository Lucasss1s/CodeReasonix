import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://jtanomwcixlxmonskmup.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YW5vbXdjaXhseG1vbnNrbXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTAyODIsImV4cCI6MjA3Mjg2NjI4Mn0.O287xN0shsovW-agYSo5awhSBcY74Z4rV11fcBsrg5E"                   
);