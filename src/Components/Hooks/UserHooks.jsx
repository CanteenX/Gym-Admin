import { useEffect, useState } from "react";
import { getLoggedinUser } from "../../api";

const useProfile = () => {
  const userProfileSession = getLoggedinUser();
  const [loading, setLoading] = useState(!userProfileSession);
  const [userProfile, setUserProfile] = useState(
    userProfileSession || null
  );

  useEffect(() => {
    const userProfileSession = getLoggedinUser();
    setUserProfile(userProfileSession || null);
    setLoading(false);
  }, []);

  return { userProfile, loading };
};

export { useProfile };