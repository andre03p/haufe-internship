// Test file for code review

function getUserData(userId) {
  // No parameter validation
  var apiUrl = "https://api.example.com/users/" + userId; // Using var instead of const

  // No error handling
  fetch(apiUrl, {
    headers: {
      Authorization: apiKey,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data); // No proper logging
      return data;
    });
  // Missing return statement and error handling
}

module.exports = { getUserData, validateUser };
