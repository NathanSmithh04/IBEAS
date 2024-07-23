import { Auth0Context } from "@auth0/auth0-react";
import { useContext } from "react";
import { useEffect, useState } from "react";
import { useAuthToken } from "../Auth0Provider";
import "../index.css";

const backendUrl = import.meta.env.VITE_REACT_APP_BACKEND_URL;

export default function ProfilePage() {
  interface Email {
    id: number;
    body?: string;
    subject?: string;
    recipients?: string;
    send_time?: string;
    code?: string;
    interval?: string;
    interval_next_send?: string;
    [key: string]: any;
  }

  interface NewEmail {
    subject: string;
    body: string;
    recipients: string;
    send_time: string;
    code: string;
    code_confirm: string;
    interval: string;
  }

  const { user } = useContext(Auth0Context);
  const token = useAuthToken();
  const [emails, setEmails] = useState<Email[]>([]);
  const [emailsCopy, setEmailsCopy] = useState<Email[]>([]);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  // const [userInfo, setUserInfo] = useState<any>(null);
  const [savingText, setSavingText] = useState<string>("Save changes");
  const [userTimezone, setUserTimezone] = useState<string>("");
  const [addingEmail, setAddingEmail] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<NewEmail>({
    subject: "",
    body: "",
    recipients: "",
    send_time: "",
    code: "",
    code_confirm: "",
    interval: "",
  });
  const [checkboxes, setCheckboxes] = useState<{ [key: string]: boolean }>({
    "new-email-checkbox": false,
  });

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
  }, []);

  function updateEmail(emailId: number, infoType: string, info: string) {
    setEmailsCopy((currentEmails: any[]) => {
      return currentEmails.map((emailCopy) => {
        if (emailCopy.id === emailId) {
          return { ...emailCopy, [infoType]: info };
        }
        return emailCopy;
      });
    });
  }

  function compareChanges() {
    if (!emails || !emailsCopy) return;

    let changes: Email[] = [];

    emailsCopy.forEach((copy: Email) => {
      let change: Email = { id: copy.id };
      let original = emails.find((email: Email) => email.id === copy.id);

      if (!original) {
        changes.push(copy);
      }

      Object.keys(copy).forEach((key) => {
        if (original && copy[key] !== original[key]) {
          change[key] = copy[key];
        }
      });

      if (Object.keys(change).length > 1) {
        changes.push(change);
      }
    });

    if (changes.length > 0) {
      saveChangesApi(changes);
    } else {
      setSavingText("No changes found");
      setTimeout(() => {
        setSavingText("Save changes");
      }, 2000);
    }
  }

  async function saveChangesApi(changes: Email[]) {
    setSavingText("Saving changes...");
    try {
      if (token && user) {
        const response = await fetch(backendUrl + "/change_email_data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: code, changes: changes }),
        });

        if (response.ok) {
          var data = await response.json();
          if (data.error) {
            alert(data.error);
          } else {
            setEmails(emailsCopy);
            data = data.success;
            for (let i = 0; i < data.length; i++) {
              setEmailsCopy((currentEmails: any[]) => {
                return currentEmails.map((emailCopy) => {
                  if (emailCopy.id === data[i].id) {
                    return {
                      ...emailCopy,
                      interval_next_send: data[i].interval_next_send,
                    };
                  }
                  return emailCopy;
                });
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSavingText("Saved!");
      setTimeout(() => {
        setSavingText("Save changes");
      }, 2000);
    }
  }

  // useEffect(() => {
  //   setUserInfo({
  //     first_name: localStorage.getItem("userFirstName"),
  //     last_name: localStorage.getItem("userLastName"),
  //   });
  // }, [token]);

  async function changeNameApi(newName: string) {
    try {
      if (token && user) {
        const response = await fetch(backendUrl + "/change_name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ new_name: newName }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.error) {
            alert(data.error);
          } else {
            localStorage.setItem("userFirstName", data.first_name);
            localStorage.setItem("userLastName", data.last_name);
            // setUserInfo({
            //   first_name: data.first_name,
            //   last_name: data.last_name,
            // });
            alert("Name changed successfully.");
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteEmailApi(emailId: number) {
    try {
      if (token && user && code) {
        const response = await fetch(backendUrl + "/delete_email_data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: emailId, code: code }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.error) {
            alert(data.error);
          } else {
            setEmails(emails.filter((email: Email) => email.id !== emailId));
            setEmailsCopy(
              emailsCopy.filter((email: Email) => email.id !== emailId)
            );
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  function deleteEmail(emailId: number) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this email?"
    );
    if (confirmDelete) {
      deleteEmailApi(emailId);
    }
  }

  function changeName() {
    const newName = prompt("Enter your new name (First Last).");
    if (newName) {
      changeNameApi(newName);
    }
  }

  async function submitCode() {
    try {
      if (token && user && code) {
        const response = await fetch(backendUrl + "/request_emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code: code }),
        });

        if (response.ok) {
          var data = await response.json();
          if (data.error) {
            alert(data.error);
          } else {
            setEmails(data.emails);
            setEmailsCopy(data.emails);
            setUnlocked(true);
            for (let i = 0; i < data.emails.length; i++) {
              setCheckboxes((prevCheckboxes) => ({
                ...prevCheckboxes,
                [data.emails[i].id]: data.emails[i].send_time !== "",
              }));
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function addEmail() {
    try {
      if (
        token &&
        user &&
        newEmail &&
        newEmail.code === newEmail.code_confirm
      ) {
        const response = await fetch(backendUrl + "/add_email_data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newEmail),
        });

        if (response.ok) {
          var data = await response.json();
          if (data.error) {
            alert(data.error);
          } else {
            if (newEmail.code === code) {
              setEmails([...emails, data]);
              setEmailsCopy([...emailsCopy, data]);
            }
            setAddingEmail(false);
            setNewEmail({
              subject: "",
              body: "",
              recipients: "",
              send_time: "",
              code: "",
              code_confirm: "",
              interval: "",
            });
            alert("Email added successfully.");
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  function adjustTextArea(event: any) {
    const textarea = event.target;
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight);
    const paddingTop = parseInt(computedStyle.paddingTop);
    const paddingBottom = parseInt(computedStyle.paddingBottom);
    const borderTop = parseInt(computedStyle.borderTopWidth);
    const borderBottom = parseInt(computedStyle.borderBottomWidth);
    textarea.style.width = "100%";
    textarea.style.height = "auto";
    const contentHeight =
      textarea.scrollHeight -
      paddingTop -
      paddingBottom -
      borderTop -
      borderBottom;
    const numberOfLines = Math.ceil(contentHeight / lineHeight);
    textarea.style.height = `${
      numberOfLines * lineHeight +
      paddingTop +
      paddingBottom +
      borderTop +
      borderBottom
    }px`;
  }

  function isValidInterval(interval: string): boolean {
    const cleanedInterval = interval.replace(/\s/g, "");
    const typeRegex = /(\d+[yY])|(\d+M)|(\d+[dD])|(\d+[hH])|(\d+m)/g;
    const matches = cleanedInterval.match(typeRegex);
    if (!matches || matches.length === 0) {
      return false;
    }
    const types = new Set<string>();
    for (const match of matches) {
      // Extract the numeric part and the type indicator separately
      const typeIndicator = match.slice(-1);

      // Standardize the type indicator to lower case except for 'M'
      let type = typeIndicator;
      if (typeIndicator.toLowerCase() !== "m") {
        type = typeIndicator.toLowerCase();
      }

      // Check if we've seen this type before
      if (types.has(type)) {
        return false;
      }
      types.add(type);
    }
    return cleanedInterval === matches.join("");
  }

  function getOrdinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function isValidRecipients(recipients: string): boolean {
    const emailRegex = /^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/;
    const emails = recipients.split(",");
    for (let email of emails) {
      email = email.trim();
      if (!emailRegex.test(email)) {
        return false;
      }
    }
    return true;
  }

  return (
    <div className="text-xl ml-2 mt-1">
      <p>
        Hello,&nbsp;{localStorage.getItem("userFirstName")}&nbsp;
        {localStorage.getItem("userLastName")}!
        <button type="button" className="ml-1.5" onClick={changeName}>
          Edit
        </button>
      </p>
      {addingEmail ? (
        <>
          <h1 className="mt-1">New Email</h1>
          <p className="my-2">
            Your time zone: {userTimezone}
            <br />
            Emails are automatically deleted after they are sent.
          </p>
          <hr />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newEmail.code !== newEmail.code_confirm) {
                alert("Codes do not match! Please try again.");
              } else if (!isValidInterval(newEmail.interval)) {
                alert(
                  `Invalid interval! Hover over the "i" for the correct format.`
                );
              } else if (!isValidRecipients(newEmail.recipients)) {
                alert(
                  "Invalid recipients! Please ensure emails are valid and separated by commas."
                );
              } else {
                addEmail();
              }
            }}
          >
            <div className="form-row mt-1">
              <p className="label-2">
                Subject:
                <br />
                {newEmail.subject.length}/1000
              </p>
              <textarea
                required
                onChange={(e) => {
                  adjustTextArea(e);
                  setNewEmail({ ...newEmail, subject: e.target.value });
                }}
                className="wide-textarea"
                onClick={(e) => adjustTextArea(e)}
                value={newEmail.subject}
                maxLength={1000}
              ></textarea>
            </div>
            <div className="form-row">
              <p className="label-2">
                Body:
                <br />
                {newEmail.body.length}/4000
              </p>
              <textarea
                required
                onChange={(e) => {
                  adjustTextArea(e);
                  setNewEmail({ ...newEmail, body: e.target.value });
                }}
                className="wide-textarea"
                onClick={(e) => adjustTextArea(e)}
                value={newEmail.body}
                maxLength={4000}
              ></textarea>
            </div>
            <div className="form-row">
              <p className="label-2">
                Recipients:
                <br />
                {newEmail.recipients.length}/1000
              </p>
              <textarea
                required
                onChange={(e) => {
                  adjustTextArea(e);
                  setNewEmail({ ...newEmail, recipients: e.target.value });
                }}
                className="wide-textarea"
                value={newEmail.recipients}
                onClick={(e) => adjustTextArea(e)}
                placeholder="Separate emails with commas (email1,email2,email3)"
              ></textarea>
            </div>
            <div className="form-row">
              <p className="label-2">Send time:</p>
              <input
                checked={checkboxes["new-email-checkbox"]}
                onChange={(e) => {
                  setCheckboxes({
                    ...checkboxes,
                    "new-email-checkbox": e.target.checked,
                  });
                  if (!e.target.checked) {
                    setNewEmail({ ...newEmail, send_time: "" });
                  }
                }}
                type="checkbox"
              />
              <input
                required={checkboxes["new-email-checkbox"]}
                disabled={!checkboxes["new-email-checkbox"]}
                type="datetime-local"
                value={newEmail.send_time}
                maxLength={100}
                onChange={(e) =>
                  setNewEmail({ ...newEmail, send_time: e.target.value })
                }
              />
            </div>
            <div className="form-row">
              <p className="label-2">Interval:</p>
              <input
                required
                type="text"
                value={newEmail.interval}
                maxLength={100}
                onChange={(e) =>
                  setNewEmail({ ...newEmail, interval: e.target.value })
                }
              />
              <p
                title="Format:&#10;XY = X years&#10;XM = X months&#10;Xd = X days&#10;Xh = X hours&#10;Xm = X minutes&#10;&#10;Example: 1Y2M3d4h5m = 1 year&#10;2 months, 3 days, 4 hours, 5 minutes"
                className="select-none"
              >
                &#128712;
              </p>
            </div>
            <div className="form-row">
              <p className="label-2">Code:</p>
              <input
                required
                className="mb-1"
                type="password"
                value={newEmail.code}
                maxLength={100}
                onChange={(e) =>
                  setNewEmail({ ...newEmail, code: e.target.value })
                }
              />
            </div>
            <div className="form-row mb-1">
              <p className="label-2">Confirm code:</p>
              <input
                required
                className="mb-1"
                type="password"
                value={newEmail.code_confirm}
                maxLength={100}
                onChange={(e) =>
                  setNewEmail({ ...newEmail, code_confirm: e.target.value })
                }
              />
            </div>
            <hr />
            <button type="submit" className="my-2 mr-2">
              Done
            </button>
            <button type="button" onClick={() => setAddingEmail(false)}>
              Cancel
            </button>
          </form>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            let validIntervals = true;
            emailsCopy.map((email: any, index: number) => {
              if (!isValidInterval(email.interval)) {
                alert(
                  `Invalid interval for the ` +
                    getOrdinal(index + 1) +
                    ` email! Hover over the "i" for the correct format.`
                );
                validIntervals = false;
              } else if (!isValidRecipients(email.recipients)) {
                alert(
                  `Invalid recipients for the ` +
                    getOrdinal(index + 1) +
                    ` email! Please ensure emails are valid and separated by commas.`
                );
                validIntervals = false;
              }
            });
            if (validIntervals) {
              compareChanges();
            }
          }}
        >
          <h1 className="mt-1">Your Emails</h1>
          {!unlocked ? (
            <div>
              <p className="my-2">
                Emails are hidden until their code is entered.
              </p>
              <input
                className="mr-2 ml-0"
                placeholder="Enter code"
                type="password"
                onChange={(e) => setCode(e.target.value)}
              />
              <button type="button" onClick={() => submitCode()}>
                Submit code
              </button>
              <br />
              <button
                type="button"
                className="mt-1"
                onClick={() => setAddingEmail(true)}
              >
                New email
              </button>
            </div>
          ) : (
            <div>
              <p className="my-2">
                Click any field to edit it. Your time zone: {userTimezone}
                <br />
                Emails are automatically deleted after they are sent.
              </p>
              <hr />
              {emailsCopy && emailsCopy.length > 0 ? (
                emailsCopy.map((emailCopy: any) => (
                  <div key={emailCopy.id} className="mr-0.5">
                    <div className="form-row mt-1">
                      <p className="label">
                        Subject:
                        <br />
                        {emailCopy.subject.length}/1000
                      </p>
                      <textarea
                        required
                        onChange={(e) => {
                          updateEmail(emailCopy.id, "subject", e.target.value);
                          adjustTextArea(e);
                        }}
                        className="wide-textarea"
                        onClick={(e) => adjustTextArea(e)}
                        value={emailCopy.subject}
                        maxLength={1000}
                      ></textarea>
                    </div>
                    <div className="form-row">
                      <p className="label">
                        Body:
                        <br />
                        {emailCopy.body.length}/4000
                      </p>
                      <textarea
                        required
                        onChange={(e) => {
                          updateEmail(emailCopy.id, "body", e.target.value);
                          adjustTextArea(e);
                        }}
                        className="wide-textarea"
                        onClick={(e) => adjustTextArea(e)}
                        value={emailCopy.body}
                        maxLength={4000}
                      ></textarea>
                    </div>
                    <div className="form-row">
                      <p className="label">
                        Recipients:
                        <br />
                        {emailCopy.recipients.length}/1000
                      </p>
                      <textarea
                        required
                        onChange={(e) => {
                          updateEmail(
                            emailCopy.id,
                            "recipients",
                            e.target.value
                          );
                          adjustTextArea(e);
                        }}
                        className="wide-textarea"
                        onClick={(e) => adjustTextArea(e)}
                        placeholder="Separate emails with commas (email1,email2,email3)"
                        value={emailCopy.recipients}
                      ></textarea>
                    </div>
                    <div className="form-row">
                      <p className="label">Send time:</p>
                      <input
                        type="checkbox"
                        checked={checkboxes[emailCopy.id]}
                        onChange={(e) => {
                          setCheckboxes({
                            ...checkboxes,
                            [emailCopy.id]: e.target.checked,
                          });
                          if (!e.target.checked) {
                            updateEmail(emailCopy.id, "send_time", "");
                          }
                        }}
                      />
                      <input
                        required={checkboxes[emailCopy.id]}
                        disabled={!checkboxes[emailCopy.id]}
                        type="datetime-local"
                        className="mb-1"
                        onChange={(e) => {
                          updateEmail(
                            emailCopy.id,
                            "send_time",
                            e.target.value
                          );
                        }}
                        value={emailCopy.send_time}
                      />
                    </div>
                    <div className="form-row mb-1">
                      <p className="label">Interval:</p>
                      <input
                        required
                        type="text"
                        value={emailCopy.interval}
                        maxLength={100}
                        onChange={(e) =>
                          updateEmail(emailCopy.id, "interval", e.target.value)
                        }
                      />
                      <p
                        title="Format:&#10;XY = X years&#10;XM = X months&#10;Xd = X days&#10;Xh = X hours&#10;Xm = X minutes&#10;&#10;Example: 1Y2M3d4h5m = 1 year&#10;2 months, 3 days, 4 hours, 5 minutes"
                        className="select-none"
                      >
                        &#128712;
                      </p>
                      <p className="ml-1">
                        Next trigger:&nbsp;{emailCopy.interval_next_send}
                      </p>
                      <button
                        type="button"
                        className="ml-auto mr-1"
                        onClick={() => deleteEmail(emailCopy.id)}
                      >
                        Delete email
                      </button>
                    </div>
                    <hr />
                  </div>
                ))
              ) : (
                <>
                  <p>No emails with this code.</p>
                  <button
                    type="button"
                    className="mt-1"
                    onClick={() => window.location.reload()}
                  >
                    Use a different code
                  </button>
                  <br />
                  <button
                    type="button"
                    className="my-2"
                    onClick={() => setAddingEmail(true)}
                  >
                    New email
                  </button>
                </>
              )}
              {emailsCopy && emailsCopy.length > 0 && (
                <>
                  <button type="submit" className="mt-2 mr-2">
                    {savingText}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                  >
                    Use a different code
                  </button>
                  <br />
                  <button
                    type="button"
                    className="my-2"
                    onClick={() => setAddingEmail(true)}
                  >
                    New email
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
