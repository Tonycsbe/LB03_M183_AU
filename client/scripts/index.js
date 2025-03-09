document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  const token = localStorage.getItem("token");
  if (!token) {
    console.error("Kein Token gefunden, weiterleiten zur Login-Seite");
    window.location.href = "/login.html";
  }

  const generateTweet = (tweet) => {

    let dateText = "Ungültiges Datum";
    if (tweet.timestamp) {
      const date = new Date(tweet.timestamp);
      if (!isNaN(date.getTime())) {
        dateText = date.toLocaleString("de-CH", {
          hour: "numeric",
          minute: "numeric",
          second: "numeric",
        });
      }
    }

    return `
    <div id="feed" class="flex flex-col gap-2 w-full">
        <div class="bg-slate-600 rounded p-4 flex gap-4 items-center border-l-4 border-blue-400">
            <img src="./img/tweet.png" alt="SwitzerChees" class="w-14 h-14 rounded-full" />
            <div class="flex flex-col grow">
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-gray-200">
                        <h3 class="font-semibold">${tweet.username || "Unbekannt"}</h3>
                        <p class="text-sm">${dateText}</p>
                    </div>
                </div>
                <p>${tweet.text || "Kein Text"}</p>
            </div>
        </div>
    </div>
  `;
  };

  const getFeed = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Kein Token gefunden, weiterleiten zur Login-Seite");
      window.location.href = "/login.html";
      return;
    }

    console.log("Token für getFeed:", token);

    const response = await fetch(`/api/feed`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const tweets = await response.json();
      console.log("Tweets aus API:", tweets);
      if (!tweets || tweets.length === 0) {
        console.warn("Keine Tweets vorhanden.");
        document.getElementById("feed").innerHTML = "<p>Keine Tweets gefunden.</p>";
        return;
      }
      const tweetsHTML = tweets.map(generateTweet).join("");
      document.getElementById("feed").innerHTML = tweetsHTML;
    } else {
      console.error("Fehler beim Laden des Feeds!");
    }
  };

  const postTweet = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Kein Token gefunden, weiterleiten zur Login-Seite");
      window.location.href = "/login.html";
      return;
    }

    const text = newTweetInput.value;
    if (!text.trim()) {
      alert("Tweet darf nicht leer sein!");
      return;
    }

    const response = await fetch("/api/feed", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({text}),
    });

    if (response.ok) {
      await getFeed();
      newTweetInput.value = "";
    } else {
      console.error("Fehler beim Posten des Tweets!");
    }
  };


  postTweetButton.addEventListener("click", postTweet);
  newTweetInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      postTweet();
    }
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.clear();
    console.log("Benutzer ausgeloggt, Token entfernt.");
    window.location.href = "/login.html";
  });

  getFeed();
});
