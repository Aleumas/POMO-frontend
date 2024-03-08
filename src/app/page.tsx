"use client";
import { useUser } from "@auth0/nextjs-auth0/client";

export default () => {
  const { user, error, isLoading } = useUser();

  return (
    <>
      {isLoading && <div>Loading...</div>}

      {error && (
        <div>
          {error.name}: {error.message}
        </div>
      )}

      {user && (
        <div>
          <h2>{user.name}</h2>
          <p>{user.sub}</p>
        </div>
      )}
    </>
  );
};
