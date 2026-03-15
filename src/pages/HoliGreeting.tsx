import { Helmet } from "react-helmet-async";

const HoliGreeting = () => {
  return (
    <>
      <Helmet>
        <title>Happy Holi 2026 — GrabYourCar</title>
        <meta name="description" content="Wishing you a Colorful & Joyful Holi from Team GrabYourCar! 🎨🚗" />
        <meta property="og:title" content="Happy Holi 2026 — GrabYourCar" />
        <meta property="og:description" content="Wishing you a Colorful & Joyful Holi! May your journeys be filled with vibrant colors & happy memories. 🎉" />
        <meta property="og:image" content="https://www.grabyourcar.com/images/holi-2026.png" />
        <meta property="og:url" content="https://www.grabyourcar.com/holi" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-400 flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl bg-white/10 backdrop-blur-sm">
          <img
            src="/images/holi-2026.png"
            alt="Happy Holi 2026 from GrabYourCar"
            className="w-full h-auto"
            loading="eager"
          />
        </div>
        <div className="mt-6 text-center text-white">
          <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg">
            🎨 Happy Holi 2026! 🎉
          </h1>
          <p className="mt-2 text-white/90 text-sm md:text-base">
            Wishing you vibrant colors & joyful journeys!
          </p>
          <p className="mt-4 text-xs text-white/70">
            With love from <span className="font-semibold">Team GrabYourCar</span> 🚗
          </p>
        </div>
      </div>
    </>
  );
};

export default HoliGreeting;
