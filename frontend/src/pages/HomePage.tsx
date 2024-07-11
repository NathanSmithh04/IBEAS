export default function HomePage() {
  return (
    <div className="text-xl ml-2 mt-1">
      <h1>Interval-Based Email Assurance System</h1>
      <p className="my-2">
        Create emails that will automatically send if their associated code is
        not entered within a specified interval.
      </p>
      <p className="my-2">
        You can use different codes for each email, and we'll only show the
        emails that correspond to the code entered.
      </p>
      <p className="my-2">
        In the unlikely case that you would be forced to enter a code to delete
        an email, I recommend that you create a "decoy email" using a different
        code.
      </p>
    </div>
  );
}
