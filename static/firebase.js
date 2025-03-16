/**
 * This is the client-side code that interacts with Firebase Auth to sign in users, updates the UI if the user is signed in,
 * and sends the user's vote to the server.
 *
 * When running on localhost, you can disable authentication by passing `auth=false` as a query parameter.
 *
 * NOTE: YOU ONLY NEED TO MODIFY THE VOTE FUNCTION AT THE BOTTOM OF THIS FILE.
 */
firebase.initializeApp(config);

// Watch for state change from sign in
function initApp() {
  firebase.auth().onAuthStateChanged((user) => {
    const signInButton = document.getElementById("signInButton");
    if (user) {
      // User is signed in.
      signInButton.innerText = "Sign Out";
      document.getElementById("form").style.display = "";
    } else {
      // No user is signed in.
      signInButton.innerText = "Sign In with Google";
      document.getElementById("form").style.display = "none";
    }
  });
}

// check if authentication is disabled via query parameter
function authDisabled() {
  const urlParams = new URLSearchParams(window.location.search);
  const hostname = window.location.hostname;
  // Auth is disabled only if running on localhost and `auth=false` is passed
  return urlParams.get("auth") === "false" && hostname === "localhost";
}

// create ID token
async function createIdToken() {
  if (authDisabled()) {
    console.warn("Auth is disabled. Returning dummy ID token.");
    return new Promise((resolve) => {
      resolve("dummyToken"); // return a dummy ID token
    });
  } else {
    return await firebase.auth().currentUser.getIdToken();
  }
}

window.onload = function () {
  if (authDisabled()) {
    console.warn("Running with auth disabled.");
    document.getElementById("signInButton").innerText = "(Auth Disabled)";
    document.getElementById("form").style.display = "";
  } else {
    console.log("Running with auth enabled.");
    initApp();
  }
};

function signIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/userinfo.email");
  firebase
    .auth()
    .signInWithPopup(provider)
    .then((result) => {
      // Returns the signed in user along with the provider's credential
      console.log(`${result.user.displayName} logged in.`);
      window.alert(`Welcome ${result.user.displayName}!`);
    })
    .catch((err) => {
      console.log(`Error during sign in: ${err.message}`);
      window.alert(`Sign in failed. Retry or check your browser logs.`);
    });
}

function signOut() {
  firebase
    .auth()
    .signOut()
    .then((result) => {})
    .catch((err) => {
      console.log(`Error during sign out: ${err.message}`);
      window.alert(`Sign out failed. Retry or check your browser logs.`);
    });
}

// Toggle Sign in/out button
function toggle() {
  if (authDisabled()) {
    window.alert("Auth is disabled.");
    return;
  }
  if (!firebase.auth().currentUser) {
    signIn();
  } else {
    signOut();
  }
}

/**
 * DO NOT ALTER ANY CODE ABOVE THIS COMMENT
 * ++++ ADD YOUR CODE BELOW ++++
 * === VOTE FUNCTION ===
 */

/**
 * Sends the user's vote to the server.
 * @param team - The team to vote for ("TABS" or "SPACES").
 * @returns {Promise<void>}
 */

async function vote(team) {
  console.log(`Submitting vote for ${team}...`);
  if (firebase.auth().currentUser || authDisabled()) {
    try {
      const token = await createIdToken();

      // Send a POST request to the backend
      const response = await fetch("/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: `team=${encodeURIComponent(team)}`,
      });

      // Parse the response
      const result = await response.json();
      if (response.ok) {
        // Update the DOM dynamically
        document.getElementById(
          "tabsCount"
        ).innerText = `${result.tabs_count} votes`;
        document.getElementById(
          "spacesCount"
        ).innerText = `${result.spaces_count} votes`;
        document.getElementById("leaderMessage").innerText =
          result.leader_message;

        // Update the recent votes list
        const recentVotesList = document.querySelector(".collection");
        recentVotesList.innerHTML = ""; // Clear the existing list
        result.recent_votes.forEach((vote) => {
          const listItem = document.createElement("li");
          listItem.className = "collection-item avatar";
          listItem.innerHTML = `
            <i class="material-icons circle teal lighten-1">${
              vote.team === "TABS" ? "》" : "⎵"
            }</i>
            <span class="title">A vote for </span><b>'${vote.team}'</b>
            <p>was cast at ${vote.time_cast}</p>
          `;
          recentVotesList.appendChild(listItem);
        });

        // Highlight the winning team's card
        const tabsCard = document.querySelector(
          ".col:nth-child(1) .card-panel"
        );
        const spacesCard = document.querySelector(
          ".col:nth-child(2) .card-panel"
        );


        if (!tabsCard || !spacesCard) {
          throw new Error(
            "One or more card elements are missing. Check your HTML structure."
          );
        }

        // Remove the highlight class from both cards
        tabsCard.classList.remove("teal", "lighten-4");
        spacesCard.classList.remove("teal", "lighten-4");

        // Add the highlight class to the winning team's card
        if (result.lead_team === "TABS") {
          tabsCard.classList.add("teal", "lighten-4");
        } else if (result.lead_team === "SPACES") {
          spacesCard.classList.add("teal", "lighten-4");
        } else {
        }
        
        console.log("Vote submitted successfully!");
      } else {
        throw new Error(result.detail || "Failed to submit vote.");
      }
    } catch (err) {
      console.error(`Error when submitting vote: ${err.message}`);
      window.alert("Something went wrong... Please try again!");
    }
  } else {
    window.alert("User not signed in.");
  }
}
