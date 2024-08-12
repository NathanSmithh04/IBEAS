export default function HomePage() {
  return (
    <div className="text-xl ml-2 mt-1">
      <h1>Interval-Based Email Assurance System</h1>
      <h3>Instructions</h3>
      <ul className="my-2">
        <li>Create emails to send in the future</li>
        <li>
          Each email has a Code, which is the only way to view and change your
          email's data
        </li>
        <li>Once an email is sent, it will be deleted</li>
        <li>
          Send Time (optional): This is when the email will be sent if you don't
          check in before
        </li>
        <li>
          Interval: This is the period of time that can pass before the email
          will be sent without checking in
        </li>
        <li>
          Check in using your Code to remove the Send Time and reset the
          Interval for all emails which the Code matches
        </li>
      </ul>
    </div>
  );
}
