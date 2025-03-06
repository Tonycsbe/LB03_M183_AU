document.addEventListener("DOMContentLoaded", () => {
  const newTweetInput = document.getElementById("new-tweet");
  const postTweetButton = document.getElementById("post-tweet");
  const logoutButton = document.getElementById("logout");

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "/login.html";
  }

  const generateTweet = (tweet) => {
    const date = new Date(tweet.timestamp).toLocaleDateString("de-CH", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    const tweetElement = `
        <div id="feed" class="flex flex-col gap-2 w-full">
            <div class="bg-slate-600 rounded p-4 flex gap-4 items-center border-l-4 border-blue-400" >
                <img src="./img/tweet.png" alt="SwitzerChees" class="w-14 h-14 rounded-full" />
                <div class="flex flex-col grow">
                <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-gray-200">
                    <h3 class="font-semibold">${tweet.username}</h3>
                    <p class="text-sm">${date}</p>
                    </div>
                </div>
                <p>${tweet.text}</p>
                </div>
            </div>
        </div>
      `;
    return tweetElement;
  };

  const getFeed = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/login.html";
      return;
    }

    const query = "SELECT * FROM tweets ORDER BY id DESC";
    const response = await fetch(`/api/feed?q=${query}`, {
      method: "GET",
      headers: {
        "Authorization": token, // token für header
      },
    });

    if (response.ok) {
      const tweets = await response.json();
      const tweetsHTML = tweets.map(generateTweet).join("");
      document.getElementById("feed").innerHTML = tweetsHTML;
    } else {
      console.error("Fehler beim Laden des Feeds!");
    }
  };

  const postTweet = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
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
        "Authorization": token,
      },
      body: JSON.stringify({text}), // nur text senden nicht sql querry
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
    window.location.href = "/login.html";
  });

  getFeed();
});
