export default function HomePage() {
  return (
    <div className="text-xl ml-2 mt-1">
      <h1>Interval-Based Email Assurance System</h1>
      <h3 className="mt-2">Instructions:</h3>
      <ol className="my-2">
        <li>1. Create emails to send in the future</li>
        <li>
          2. Each email has a Code, which is the only way to view and change
          your email's data
        </li>
        <li>3. Once an email is sent, it will be deleted</li>
        <li>
          4. Send Time (optional): This is when the email will be sent if you
          don't check in before
        </li>
        <li>
          5. Interval: This is the period of time that can pass before the email
          will be sent without checking in
        </li>
        <li>
          6. Check in using your Code to remove the Send Time and reset the
          Interval for all emails which the Code matches
        </li>
      </ol>
    </div>
  );
}
