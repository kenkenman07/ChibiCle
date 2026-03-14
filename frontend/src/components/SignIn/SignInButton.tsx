import { authRepository } from "../../modules/auth/auth.repository";

const SignInButton = () => {
  const signInGoogle = async () => {
    await authRepository.signInGoogle();
  };

  return (
    <button
      onClick={signInGoogle}
      className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center shadow-lg transition-colors"
    >
      <img
        src="https://www.svgrepo.com/show/475656/google-color.svg"
        alt="Google"
        className="w-5 h-5 mr-3 bg-white rounded-full p-0.5"
      />
      Google サインイン
    </button>
  );
};
export default SignInButton;
