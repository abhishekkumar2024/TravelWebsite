'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';

type FAQItem = {
    question: string;
    questionHi: string;
    answer: string;
    answerHi: string;
};

const faqs: FAQItem[] = [
    {
        question: "What is the best time to visit Rajasthan?",
        questionHi: "राजस्थान घूमने का सबसे अच्छा समय क्या है?",
        answer: "The best time to visit Rajasthan is during the winter months from October to March. The weather is pleasant during the day and cool at night, making it perfect for sightseeing and desert activities.",
        answerHi: "राजस्थान घूमने का सबसे अच्छा समय अक्टूबर से मार्च तक सर्दियों के महीनों के दौरान है। दिन में मौसम सुहावना और रात में ठंडा रहता है, जो दर्शनीय स्थलों और रेगिस्तानी गतिविधियों के लिए एकदम सही है।"
    },
    {
        question: "How many days are recommended for a Rajasthan trip?",
        questionHi: "राजस्थान यात्रा के लिए कितने दिन अनुशंसित हैं?",
        answer: "Ideally, you need 7-10 days to cover major cities like Jaipur, Udaipur, Jodhpur, and Jaisalmer comfortably. If you want to explore deeper into rural areas, plan for at least 14 days.",
        answerHi: "आदर्श रूप से, आपको जयपुर, उदयपुर, जोधपुर और जैसलमेर जैसे प्रमुख शहरों को आराम से कवर करने के लिए 7-10 दिनों की आवश्यकता है। यदि आप ग्रामीण क्षेत्रों में गहराई से जाना चाहते हैं, तो कम से कम 14 दिनों की योजना बनाएं।"
    },
    {
        question: "Is Rajasthan safe for solo female travelers?",
        questionHi: "क्या राजस्थान एकल महिला यात्रियों के लिए सुरक्षित है?",
        answer: "Yes, Rajasthan is generally safe for solo female travelers. People are hospitable and helpful. However, like any tourist destination, it's advisable to avoid isolated areas at night and respect local customs.",
        answerHi: "हां, राजस्थान आम तौर पर एकल महिला यात्रियों के लिए सुरक्षित है। लोग मेहमाननवाज और मददगार हैं। हालांकि, किसी भी पर्यटन स्थल की तरह, रात में सुनसान इलाकों से बचने और स्थानीय रीति-रिवाजों का सम्मान करने की सलाह दी जाती है।"
    },
    {
        question: "What should I pack for a desert safari?",
        questionHi: "रेगिस्तान सफारी के लिए मुझे क्या पैक करना चाहिए?",
        answer: "Pack comfortable cotton clothes for the day and warm layers for the night, as temperatures drop significantly. Don't forget sunscreen, sunglasses, a hat, and a good pair of walking shoes.",
        answerHi: "दिन के लिए आरामदायक सूती कपड़े और रात के लिए गर्म कपड़े पैक करें, क्योंकि तापमान काफी गिर जाता है। सनस्क्रीन, धूप का चश्मा, एक टोपी और अच्छे जूते ले जाना न भूलें।"
    },
    {
        question: "How can I share my travel story on CamelThar?",
        questionHi: "मैं अपनी यात्रा की कहानी कैमलथार पर कैसे साझा कर सकता हूं?",
        answer: "It's easy! Click on the 'Submit Your Blog' button in the navigation menu. You'll need to log in, write your story, add photos, and submit. Our team reviews and publishes it within 24 hours.",
        answerHi: "यह आसान है! नेविगेशन मेनू में 'अपना ब्लॉग जमा करें' बटन पर क्लिक करें। आपको लॉग इन करना होगा, अपनी कहानी लिखनी होगी, फोटो जोड़ने होंगे और जमा करना होगा। हमारी टीम समीक्षा करती है और इसे 24 घंटों के भीतर प्रकाशित करती है।"
    }
];

export default function FAQSection() {
    const { t } = useLanguage();
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    // Generate FAQPage structured data for rich snippets in Google
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };

    return (
        <section className="py-20 px-4 bg-gray-50">
            {/* FAQ Structured Data for Google Rich Snippets */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {t('Frequently Asked Questions', 'अक्सर पूछे जाने वाले प्रश्न')}
                    </h2>
                    <p className="text-gray-600 text-lg">
                        {t('Everything you need to know before your trip', 'अपनी यात्रा से पहले आपको जो कुछ भी जानने की जरूरत है')}
                    </p>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`bg-white rounded-xl overflow-hidden transition-all duration-300 ${openIndex === index
                                ? 'shadow-lg ring-1 ring-royal-blue/10'
                                : 'shadow-sm hover:shadow-md'
                                }`}
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                aria-expanded={openIndex === index}
                            >
                                <span className={`font-semibold text-lg ${openIndex === index ? 'text-royal-blue' : 'text-gray-800'
                                    }`}>
                                    {t(faq.question, faq.questionHi)}
                                </span>
                                <span className={`flex-shrink-0 ml-4 w-8 h-8 flex items-center justify-center rounded-full transition-transform duration-300 ${openIndex === index
                                    ? 'bg-royal-blue text-white rotate-180'
                                    : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>

                            <div
                                className={`transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    } overflow-hidden`}
                            >
                                <div className="p-6 pt-0 text-gray-600 leading-relaxed border-t border-gray-100 mt-2">
                                    {t(faq.answer, faq.answerHi)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
