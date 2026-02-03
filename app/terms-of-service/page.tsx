'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';

export default function TermsOfServicePage() {
    const { t } = useLanguage();

    return (
        <>
            {/* Hero Section */}
            <section className="pt-32 pb-16 px-4 bg-gradient-to-br from-deep-maroon to-royal-blue text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        {t('Terms of Service', 'सेवा की शर्तें')}
                    </h1>
                    <p className="text-lg opacity-90">
                        {t('Last updated: February 4, 2026', 'अंतिम अपडेट: 4 फरवरी, 2026')}
                    </p>
                </div>
            </section>

            {/* Content */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
                    <div className="prose prose-lg max-w-none">

                        {/* Agreement */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">1</span>
                                {t('Agreement to Terms', 'शर्तों से सहमति')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                {t(
                                    'By accessing and using CamelThar (camelthar.com), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.',
                                    'CamelThar (camelthar.com) तक पहुंचने और उपयोग करके, आप इन सेवा की शर्तों से बाध्य होने के लिए सहमत हैं। यदि आप इन शर्तों के किसी भी हिस्से से सहमत नहीं हैं, तो आप हमारी सेवाओं का उपयोग नहीं कर सकते।'
                                )}
                            </p>
                        </div>

                        {/* Use of Services */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">2</span>
                                {t('Use of Services', 'सेवाओं का उपयोग')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                {t('You may use our services to:', 'आप हमारी सेवाओं का उपयोग इसके लिए कर सकते हैं:')}
                            </p>
                            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                                <li>{t('Read and explore travel blogs about Rajasthan', 'राजस्थान के बारे में यात्रा ब्लॉग पढ़ें और देखें')}</li>
                                <li>{t('Create an account and participate in discussions', 'एक खाता बनाएं और चर्चाओं में भाग लें')}</li>
                                <li>{t('Submit your own travel stories and experiences', 'अपनी खुद की यात्रा कहानियां और अनुभव जमा करें')}</li>
                                <li>{t('Like and comment on blog posts', 'ब्लॉग पोस्ट को लाइक और कमेंट करें')}</li>
                            </ul>
                        </div>

                        {/* User Accounts */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">3</span>
                                {t('User Accounts', 'उपयोगकर्ता खाते')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                {t('When creating an account, you agree to:', 'खाता बनाते समय, आप सहमत हैं कि:')}
                            </p>
                            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                                <li>{t('Provide accurate and complete information', 'सटीक और पूर्ण जानकारी प्रदान करें')}</li>
                                <li>{t('Maintain the security of your account', 'अपने खाते की सुरक्षा बनाए रखें')}</li>
                                <li>{t('Not share your login credentials with others', 'अपनी लॉगिन जानकारी दूसरों के साथ साझा न करें')}</li>
                                <li>{t('Notify us of any unauthorized access', 'किसी भी अनधिकृत पहुंच के बारे में हमें सूचित करें')}</li>
                            </ul>
                        </div>

                        {/* Content Guidelines */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">4</span>
                                {t('Content Guidelines', 'सामग्री दिशानिर्देश')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                {t('When submitting content (blogs, comments), you must not:', 'सामग्री (ब्लॉग, टिप्पणियां) जमा करते समय, आपको नहीं करना चाहिए:')}
                            </p>
                            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                                <li>{t('Post false, misleading, or inaccurate information', 'गलत, भ्रामक या गलत जानकारी पोस्ट करें')}</li>
                                <li>{t('Upload content that infringes copyrights or trademarks', 'ऐसी सामग्री अपलोड करें जो कॉपीराइट या ट्रेडमार्क का उल्लंघन करती हो')}</li>
                                <li>{t('Share offensive, abusive, or hateful content', 'आपत्तिजनक, अपमानजनक या घृणास्पद सामग्री साझा करें')}</li>
                                <li>{t('Spam or post promotional content without permission', 'बिना अनुमति के स्पैम या प्रचार सामग्री पोस्ट करें')}</li>
                                <li>{t('Harass or bully other users', 'अन्य उपयोगकर्ताओं को परेशान या धमकाएं')}</li>
                            </ul>

                            <div className="mt-6 p-4 bg-desert-gold/10 border border-desert-gold/30 rounded-xl">
                                <p className="text-gray-700">
                                    <strong>⚠️ {t('Note:', 'नोट:')}</strong> {t(
                                        'We reserve the right to remove any content that violates these guidelines and suspend accounts of repeat offenders.',
                                        'हम इन दिशानिर्देशों का उल्लंघन करने वाली किसी भी सामग्री को हटाने और बार-बार उल्लंघन करने वालों के खातों को निलंबित करने का अधिकार सुरक्षित रखते हैं।'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Intellectual Property */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">5</span>
                                {t('Intellectual Property', 'बौद्धिक संपदा')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                {t(
                                    'The CamelThar name, logo, and all original content on this website are our intellectual property. You may not use, copy, or distribute our content without written permission.',
                                    'CamelThar नाम, लोगो और इस वेबसाइट पर सभी मूल सामग्री हमारी बौद्धिक संपदा है। आप लिखित अनुमति के बिना हमारी सामग्री का उपयोग, कॉपी या वितरण नहीं कर सकते।'
                                )}
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                {t(
                                    'By submitting blogs to CamelThar, you grant us a non-exclusive, royalty-free license to publish, display, and promote your content on our platform.',
                                    'CamelThar पर ब्लॉग जमा करके, आप हमें अपनी सामग्री को हमारे प्लेटफॉर्म पर प्रकाशित, प्रदर्शित और प्रचारित करने के लिए एक गैर-अनन्य, रॉयल्टी-मुक्त लाइसेंस प्रदान करते हैं।'
                                )}
                            </p>
                        </div>

                        {/* Affiliate Links */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">6</span>
                                {t('Affiliate Links & Products', 'एफिलिएट लिंक और उत्पाद')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                {t(
                                    'Our website may contain affiliate links to products and services. When you make a purchase through these links, we may earn a small commission at no extra cost to you. We only recommend products we believe will be helpful to travelers.',
                                    'हमारी वेबसाइट में उत्पादों और सेवाओं के एफिलिएट लिंक हो सकते हैं। जब आप इन लिंक के माध्यम से खरीदारी करते हैं, तो हम आपको बिना किसी अतिरिक्त लागत के एक छोटा कमीशन कमा सकते हैं। हम केवल उन उत्पादों की सिफारिश करते हैं जो हमें लगता है कि यात्रियों के लिए उपयोगी होंगे।'
                                )}
                            </p>
                        </div>

                        {/* Disclaimer */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">7</span>
                                {t('Disclaimer', 'अस्वीकरण')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed mb-4">
                                {t(
                                    'The information provided on CamelThar is for general informational purposes only. While we strive to keep the information accurate and up-to-date:',
                                    'CamelThar पर प्रदान की गई जानकारी केवल सामान्य सूचनात्मक उद्देश्यों के लिए है। जबकि हम जानकारी को सटीक और अद्यतित रखने का प्रयास करते हैं:'
                                )}
                            </p>
                            <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                                <li>{t('Travel conditions may change without notice', 'यात्रा की स्थिति बिना सूचना के बदल सकती है')}</li>
                                <li>{t('Prices and availability may vary', 'कीमतें और उपलब्धता अलग-अलग हो सकती है')}</li>
                                <li>{t('We are not responsible for any travel decisions based on our content', 'हम अपनी सामग्री के आधार पर किए गए किसी भी यात्रा निर्णय के लिए जिम्मेदार नहीं हैं')}</li>
                            </ul>
                        </div>

                        {/* Limitation of Liability */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">8</span>
                                {t('Limitation of Liability', 'दायित्व की सीमा')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                {t(
                                    'CamelThar and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the website or reliance on any information provided.',
                                    'CamelThar और इसके संचालक वेबसाइट के आपके उपयोग या प्रदान की गई किसी भी जानकारी पर निर्भरता से उत्पन्न किसी भी अप्रत्यक्ष, आकस्मिक, विशेष या परिणामी नुकसान के लिए उत्तरदायी नहीं होंगे।'
                                )}
                            </p>
                        </div>

                        {/* Changes to Terms */}
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">9</span>
                                {t('Changes to Terms', 'शर्तों में बदलाव')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                {t(
                                    'We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting on this page. Continued use of the website after changes constitutes acceptance of the new terms.',
                                    'हम किसी भी समय इन सेवा की शर्तों को संशोधित करने का अधिकार सुरक्षित रखते हैं। इस पृष्ठ पर पोस्ट करने के तुरंत बाद परिवर्तन प्रभावी होंगे। परिवर्तनों के बाद वेबसाइट का निरंतर उपयोग नई शर्तों की स्वीकृति है।'
                                )}
                            </p>
                        </div>

                        {/* Contact */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-deep-maroon mb-4 flex items-center gap-3">
                                <span className="w-10 h-10 bg-deep-maroon/10 rounded-full flex items-center justify-center text-lg">10</span>
                                {t('Contact Us', 'हमसे संपर्क करें')}
                            </h2>
                            <p className="text-gray-600 leading-relaxed">
                                {t(
                                    'If you have any questions about these Terms of Service, please contact us at:',
                                    'यदि इन सेवा की शर्तों के बारे में आपके कोई प्रश्न हैं, तो कृपया हमसे संपर्क करें:'
                                )}
                            </p>
                            <div className="mt-4 p-4 bg-sand rounded-xl">
                                <p className="text-gray-700 font-medium">📧 contact@camelthar.com</p>
                            </div>
                        </div>

                    </div>

                    {/* Back Link */}
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-desert-gold font-semibold hover:underline"
                        >
                            ← {t('Back to Home', 'होम पर वापस जाएं')}
                        </Link>
                    </div>
                </div>
            </section>
        </>
    );
}
