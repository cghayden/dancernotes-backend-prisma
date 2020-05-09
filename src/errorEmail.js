const errorEmail = (userId) => {
  `<div>
    <p>An error occurred while a user was deleting their account from dancernotes.</p>
  <p>User Id : ${userId}</p>
  </div>`;
};

exports.errorEmail = errorEmail;
