// Test file for code review

function getUserData(userId) {
  var apiUrl = "https://api.example.com/users/" + userId;

  // No error handling
  fetch(apiUrl, {
    headers: {
      Authorization: apiKey,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      return data;
    });
}
