import { Helmet } from "react-helmet-async";

const PrivacyPolicy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | GrabYourCar</title>
        <meta name="description" content="Privacy Policy for GrabYourCar - Learn how we collect, use, and protect your personal information." />
      </Helmet>
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto prose prose-sm sm:prose dark:prose-invert">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: April 11, 2026</p>

          <h2>1. Introduction</h2>
          <p>
            GrabYourCar ("we", "our", or "us"), operated by Adis Makethemoney Services Pvt Ltd, is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at www.grabyourcar.com and use our services.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>Personal Information:</strong> Name, email address, phone number, and address when you submit forms, create an account, or make inquiries.</li>
            <li><strong>Vehicle Preferences:</strong> Car models, budget range, and other preferences you share with us.</li>
            <li><strong>Usage Data:</strong> Pages visited, time spent, browser type, device information, and IP address.</li>
            <li><strong>Cookies:</strong> We use cookies and similar technologies to enhance your browsing experience.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain our car buying, insurance, and accessories services.</li>
            <li>To communicate with you regarding inquiries, bookings, and offers.</li>
            <li>To send promotional messages via WhatsApp, email, or SMS (with your consent).</li>
            <li>To improve our website and user experience.</li>
            <li>To comply with legal obligations.</li>
          </ul>

          <h2>4. Information Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with trusted partners (car dealers, insurance providers, financial institutions) only to fulfill your service requests. We may also share information when required by law.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.
          </p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access, update, or delete your personal information.</li>
            <li>Opt out of marketing communications at any time.</li>
            <li>Request a copy of the data we hold about you.</li>
          </ul>

          <h2>7. Third-Party Services</h2>
          <p>
            Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date.
          </p>

          <h2>9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <ul>
            <li>Email: hrgyb1@gmail.com</li>
            <li>Phone: +91 95772 00023</li>
            <li>Website: www.grabyourcar.com</li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
