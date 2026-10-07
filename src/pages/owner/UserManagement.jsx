import { useEffect, useState } from "react";
import OwnerLayout from "../../components/owner/OwnerLayout";
import { getAllUsersForOwner, toggleBlockUser } from "../../services/userService";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  function loadUsers() {
    setLoading(true);
    getAllUsersForOwner()
      .then((data) => setUsers(data.filter((u) => u.role !== "owner")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleToggleBlock(usr) {
    const nextBlocked = !usr.isBlocked;
    setFeedback("");
    try {
      await toggleBlockUser(usr.uid || usr.id, nextBlocked);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === usr.id || u.uid === usr.uid ? { ...u, isBlocked: nextBlocked } : u
        )
      );
      setFeedback(
        `Customer ${usr.customerId || usr.fullName} is now ${
          nextBlocked ? "BLOCKED" : "ACTIVE"
        }.`
      );
    } catch (err) {
      console.error("Block toggle error:", err);
      alert("Failed to toggle customer status.");
    }
  }

  return (
    <OwnerLayout
      title="Customer & User Management"
      subtitle="Inspect customer profiles and restrict or restore customer account access"
    >
      {feedback && <div className="auth-alert success">{feedback}</div>}

      {loading ? (
        <p className="muted">Loading customer records...</p>
      ) : (
        <div className="card owner-table-card">
          {users.length === 0 ? (
            <p className="muted">No customers registered yet.</p>
          ) : (
            <div className="owner-table-wrapper">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Registered Address</th>
                    <th>Account Status</th>
                    <th>Security Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((usr) => (
                    <tr key={usr.id || usr.uid}>
                      <td><strong>{usr.customerId || "CUS-10001"}</strong></td>
                      <td>
                        <strong>{usr.fullName || "Customer"}</strong>
                      </td>
                      <td>{usr.email}</td>
                      <td>{usr.mobile || "—"}</td>
                      <td style={{ maxWidth: "200px", fontSize: "12.5px" }}>
                        {usr.address || "—"}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            (usr.status === "blocked" || usr.isBlocked) ? "cancelled" : "delivered"
                          }`}
                        >
                          {usr.status === "blocked" || usr.isBlocked ? "Blocked" : "Active"}
                        </span>
                        {usr.lastLoginAt?.toDate && (
                          <span className="muted" style={{ display: "block", fontSize: "11px", marginTop: "4px" }}>
                            Last login: {usr.lastLoginAt.toDate().toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleBlock(usr)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            borderColor: usr.isBlocked ? "#166534" : "#991b1b",
                            color: usr.isBlocked ? "#166534" : "#991b1b",
                            fontWeight: 600,
                          }}
                        >
                          {usr.isBlocked ? "✓ Unblock Customer" : "✕ Block Customer"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </OwnerLayout>
  );
}
