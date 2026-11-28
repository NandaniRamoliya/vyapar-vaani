import { LanguageCode } from '../types';

type Entry = { en: string; hi: string; gu: string };

/**
 * Every screen's words, in plain shop language (no tech terms).
 * Use {name}-style placeholders for values.
 */
const D = {
  // navigation
  'nav.voice': { en: 'Vaani', hi: 'वाणी', gu: 'વાણી' },
  'nav.today': { en: 'Today', hi: 'आज', gu: 'આજે' },
  'nav.khata': { en: 'Khata', hi: 'खाता', gu: 'ખાતું' },
  'nav.reminders': { en: 'Reminders', hi: 'याद', gu: 'યાદ' },
  'nav.orders': { en: 'Bills', hi: 'बिल', gu: 'બિલ' },
  'nav.customers': { en: 'Customers', hi: 'ग्राहक', gu: 'ગ્રાહકો' },
  'nav.history': { en: 'Conversation log', hi: 'बातचीत', gu: 'વાતચીત' },
  'nav.settings': { en: 'Settings', hi: 'सेटिंग', gu: 'સેટિંગ' },
  'nav.more': { en: 'More', hi: 'और', gu: 'વધુ' },
  'nav.talk': { en: 'Talk to Vaani', hi: 'वाणी से बोलें', gu: 'વાણી સાથે બોલો' },
  'shop.name': { en: 'Nandani Textiles', hi: 'नंदनी टेक्सटाइल्स', gu: 'નંદની ટેક્સટાઇલ્સ' },
  'shop.city': { en: 'Surat, Gujarat', hi: 'सूरत, गुजरात', gu: 'સુરત, ગુજરાત' },

  // page titles
  'title.voice': { en: 'Vaani · your voice munim', hi: 'वाणी · आपकी आवाज़ वाली मुनीम', gu: 'વાણી · તમારી અવાજવાળી મુનીમ' },
  'sub.voice': { en: 'Just speak. Customers confirm udhar in their own voice.', hi: 'बस बोलिए। ग्राहक अपनी आवाज़ में उधार पक्का करते हैं।', gu: 'બસ બોલો. ગ્રાહક પોતાના અવાજમાં ઉધાર પાકું કરે છે.' },
  'title.today': { en: 'Your shop today', hi: 'आज आपकी दुकान', gu: 'આજે તમારી દુકાન' },
  'sub.today': { en: 'Sales, money received, and who to call', hi: 'बिक्री, मिले पैसे और किसे फ़ोन करना है', gu: 'વેચાણ, મળેલા પૈસા અને કોને ફોન કરવો' },
  'title.khata': { en: 'Khata book', hi: 'खाता बही', gu: 'ખાતાવહી' },
  'sub.khata': { en: 'Who owes you, how much, and since when', hi: 'किसका कितना बाकी है और कब से', gu: 'કોના કેટલા બાકી છે અને ક્યારથી' },
  'title.reminders': { en: 'Reminders', hi: 'याद दिलाने वाले काम', gu: 'યાદ અપાવવાના કામ' },
  'sub.reminders': { en: 'Vaani rings, speaks and notifies you on time', hi: 'समय पर वाणी घंटी बजाएगी, बोलेगी और सूचना देगी', gu: 'સમયે વાણી ઘંટડી વગાડશે, બોલશે અને સૂચના આપશે' },
  'title.orders': { en: 'Bills & orders', hi: 'बिल और ऑर्डर', gu: 'બિલ અને ઓર્ડર' },
  'sub.orders': { en: 'Everything you sold', hi: 'आपने जो भी बेचा', gu: 'તમે જે વેચ્યું તે બધું' },
  'title.customers': { en: 'Customers', hi: 'ग्राहक', gu: 'ગ્રાહકો' },
  'sub.customers': { en: 'Names, phone numbers and what they owe', hi: 'नाम, फ़ोन और बाकी पैसे', gu: 'નામ, ફોન અને બાકી પૈસા' },
  'title.history': { en: 'Conversation log', hi: 'बातचीत का रिकॉर्ड', gu: 'વાતચીતનો રેકોર્ડ' },
  'sub.history': { en: 'Everything you said to Vaani, and what she did', hi: 'आपने वाणी से जो कहा और उसने क्या किया', gu: 'તમે વાણીને શું કહ્યું અને તેણે શું કર્યું' },
  'title.settings': { en: 'Settings', hi: 'सेटिंग', gu: 'સેટિંગ' },
  'sub.settings': { en: 'Language, alerts and safety', hi: 'भाषा, सूचना और सुरक्षा', gu: 'ભાષા, સૂચના અને સુરક્ષા' },

  // common
  'common.search': { en: 'Search name or phone…', hi: 'नाम या फ़ोन खोजें…', gu: 'નામ કે ફોન શોધો…' },
  'common.call': { en: 'Call', hi: 'फ़ोन', gu: 'ફોન' },
  'common.whatsapp': { en: 'WhatsApp', hi: 'WhatsApp', gu: 'WhatsApp' },
  'common.done': { en: 'Done', hi: 'हो गया', gu: 'થઈ ગયું' },
  'common.save': { en: 'Save', hi: 'सेव करें', gu: 'સેવ કરો' },
  'common.saving': { en: 'Saving…', hi: 'सेव हो रहा है…', gu: 'સેવ થાય છે…' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें', gu: 'રદ કરો' },
  'common.delete': { en: 'Delete', hi: 'हटाएँ', gu: 'કાઢી નાખો' },
  'common.add': { en: 'Add', hi: 'जोड़ें', gu: 'ઉમેરો' },
  'common.all': { en: 'All', hi: 'सब', gu: 'બધા' },
  'common.today': { en: 'Today', hi: 'आज', gu: 'આજે' },
  'common.tomorrow': { en: 'Tomorrow', hi: 'कल', gu: 'આવતીકાલે' },
  'common.yesterday': { en: 'Yesterday', hi: 'कल (बीता)', gu: 'ગઈકાલે' },
  'common.noPhone': { en: 'No phone saved', hi: 'फ़ोन नंबर नहीं है', gu: 'ફોન નંબર નથી' },
  'common.owes': { en: 'owes {amt}', hi: '{amt} बाकी', gu: '{amt} બાકી' },
  'common.settled': { en: 'All clear', hi: 'खाता साफ़', gu: 'ખાતું ચોખ્ખું' },
  'common.advance': { en: 'Advance {amt}', hi: '{amt} एडवांस', gu: '{amt} એડવાન્સ' },
  'common.speakInstead': { en: 'Or just say it to Vaani', hi: 'या बस वाणी से बोल दीजिए', gu: 'અથવા બસ વાણીને કહી દો' },
  'common.ago.min': { en: '{n} min ago', hi: '{n} मिनट पहले', gu: '{n} મિનિટ પહેલાં' },
  'common.ago.hr': { en: '{n} hr ago', hi: '{n} घंटे पहले', gu: '{n} કલાક પહેલાં' },
  'common.ago.day': { en: '{n} days ago', hi: '{n} दिन पहले', gu: '{n} દિવસ પહેલાં' },
  'common.justNow': { en: 'just now', hi: 'अभी', gu: 'હમણાં' },
  'common.paidToday': { en: 'Paid today', hi: 'आज पैसे दिए', gu: 'આજે પૈસા આપ્યા' },
  'common.daysSincePay': { en: '{n} days since last payment', hi: 'आखिरी पेमेंट को {n} दिन', gu: 'છેલ્લા પેમેન્ટને {n} દિવસ' },
  'common.unpaidDays': { en: 'Not paid for {n} days', hi: '{n} दिन से पैसे नहीं दिए', gu: '{n} દિવસથી પૈસા નથી આપ્યા' },
  'common.udharToday': { en: 'Udhar given today', hi: 'आज उधार दिया', gu: 'આજે ઉધાર આપ્યું' },

  // today
  'today.hello': { en: 'Namaste 🙏 Here is your shop today', hi: 'नमस्ते 🙏 आज आपकी दुकान का हाल', gu: 'નમસ્તે 🙏 આજે તમારી દુકાનનો હિસાબ' },
  'today.sold': { en: 'Sold today', hi: 'आज की बिक्री', gu: 'આજનું વેચાણ' },
  'today.bills': { en: '{n} bills', hi: '{n} बिल', gu: '{n} બિલ' },
  'today.received': { en: 'Money received today', hi: 'आज मिले पैसे', gu: 'આજે મળેલા પૈસા' },
  'today.udhar': { en: 'Udhar given today', hi: 'आज दिया उधार', gu: 'આજે આપેલું ઉધાર' },
  'today.market': { en: 'Total udhar in market', hi: 'बाज़ार में कुल उधार', gu: 'બજારમાં કુલ ઉધાર' },
  'today.people': { en: '{n} people owe you', hi: '{n} लोगों से लेना है', gu: '{n} લોકો પાસેથી લેવાના' },
  'today.tasks': { en: 'To do today', hi: 'आज के काम', gu: 'આજના કામ' },
  'today.noTasks': { en: 'Nothing pending. Relax ☕', hi: 'कोई काम बाकी नहीं। आराम कीजिए ☕', gu: 'કોઈ કામ બાકી નથી. આરામ કરો ☕' },
  'today.collect': { en: 'Collect money from', hi: 'इनसे पैसे लेने हैं', gu: 'આમની પાસેથી પૈસા લેવાના' },
  'today.recent': { en: 'What happened', hi: 'क्या हुआ', gu: 'શું થયું' },
  'today.ev.payment': { en: '{name} paid {amt}', hi: '{name} ने {amt} दिए', gu: '{name} એ {amt} આપ્યા' },
  'today.ev.udhar': { en: '{name} took {amt} on udhar', hi: '{name} ने {amt} उधार लिए', gu: '{name} એ {amt} ઉધાર લીધા' },
  'today.ev.order': { en: '{name} bought {detail} · {amt}', hi: '{name} ने खरीदा {detail} · {amt}', gu: '{name} એ ખરીદ્યું {detail} · {amt}' },
  'today.overdue': { en: '{n} late', hi: '{n} देर से', gu: '{n} મોડા' },

  // reminders
  'rem.allowTitle': { en: 'Turn on alerts', hi: 'सूचना चालू करें', gu: 'સૂચના ચાલુ કરો' },
  'rem.allowText': {
    en: 'When it is time, Vaani rings, speaks the reminder and shows a phone notification. Keep the app open (it can be in the background).',
    hi: 'समय होने पर वाणी घंटी बजाएगी, याद बोलेगी और फ़ोन पर सूचना दिखाएगी। ऐप खुला रखें (पीछे चल सकता है)।',
    gu: 'સમય થાય ત્યારે વાણી ઘંટડી વગાડશે, યાદ બોલશે અને ફોન પર સૂચના બતાવશે. એપ ખુલ્લી રાખો (પાછળ ચાલુ રહી શકે).',
  },
  'rem.allowBtn': { en: 'Allow alerts', hi: 'अनुमति दें', gu: 'મંજૂરી આપો' },
  'rem.alertsOn': { en: 'Alerts are on', hi: 'सूचना चालू है', gu: 'સૂચના ચાલુ છે' },
  'rem.alertsBlocked': { en: 'Alerts are blocked in the browser settings. Vaani will still ring and speak while the app is open.', hi: 'ब्राउज़र में सूचना बंद है। ऐप खुला रहे तो वाणी फिर भी घंटी बजाएगी और बोलेगी।', gu: 'બ્રાઉઝરમાં સૂચના બંધ છે. એપ ખુલ્લી હશે તો વાણી તો પણ ઘંટડી વગાડશે અને બોલશે.' },
  'rem.voiceHint': { en: 'Say: “Kal subah 10 baje Rahul ko call karna yaad dilana” or “Remind me in 10 minutes”', hi: 'बोलिए: “कल सुबह 10 बजे राहुल को फ़ोन करना याद दिलाना” या “10 मिनट बाद याद दिलाना”', gu: 'બોલો: “કાલે સવારે 10 વાગ્યે રાહુલને ફોન કરવાનું યાદ અપાવો” અથવા “10 મિનિટ પછી યાદ અપાવો”' },
  'rem.new': { en: 'New reminder', hi: 'नया रिमाइंडर', gu: 'નવું રિમાઇન્ડર' },
  'rem.what': { en: 'What to remember?', hi: 'क्या याद दिलाना है?', gu: 'શું યાદ અપાવવું છે?' },
  'rem.whatPh': { en: 'e.g. Call Rahul for payment', hi: 'जैसे: राहुल को पैसे के लिए फ़ोन', gu: 'જેમ કે: રાહુલને પૈસા માટે ફોન' },
  'rem.when': { en: 'When?', hi: 'कब?', gu: 'ક્યારે?' },
  'rem.in10': { en: 'In 10 min', hi: '10 मिनट में', gu: '10 મિનિટમાં' },
  'rem.in1h': { en: 'In 1 hour', hi: '1 घंटे में', gu: '1 કલાકમાં' },
  'rem.eve': { en: 'This evening 6', hi: 'आज शाम 6', gu: 'આજે સાંજે 6' },
  'rem.tom': { en: 'Tomorrow 10 AM', hi: 'कल सुबह 10', gu: 'કાલે સવારે 10' },
  'rem.who': { en: 'Customer (optional)', hi: 'ग्राहक (ज़रूरी नहीं)', gu: 'ગ્રાહક (જરૂરી નથી)' },
  'rem.none': { en: '— nobody —', hi: '— कोई नहीं —', gu: '— કોઈ નહીં —' },
  'rem.late': { en: 'Late', hi: 'देर हो गई', gu: 'મોડું થયું' },
  'rem.upcoming': { en: 'Coming up', hi: 'आने वाले', gu: 'આવનારા' },
  'rem.finished': { en: 'Done', hi: 'पूरे हुए', gu: 'પૂરા થયા' },
  'rem.empty': { en: 'No reminders yet', hi: 'अभी कोई रिमाइंडर नहीं', gu: 'હજી કોઈ રિમાઇન્ડર નથી' },
  'rem.snooze': { en: '10 min later', hi: '10 मिनट बाद', gu: '10 મિનિટ પછી' },
  'rem.timeUp': { en: 'Reminder', hi: 'याद दिलाना', gu: 'યાદ અપાવવું' },
  'rem.speak': { en: 'Reminder: {title}', hi: 'याद दिलाना है: {title}', gu: 'યાદ અપાવું છું: {title}' },
  'rem.reopen': { en: 'Bring back', hi: 'वापस लाएँ', gu: 'પાછું લાવો' },

  // khata
  'kh.outstanding': { en: 'Udhar in market', hi: 'बाज़ार में उधार', gu: 'બજારમાં ઉધાર' },
  'kh.withDues': { en: 'People who owe', hi: 'जिनसे लेना है', gu: 'જેમની પાસેથી લેવાના' },
  'kh.collectedMonth': { en: 'Received this month', hi: 'इस महीने मिले', gu: 'આ મહિને મળ્યા' },
  'kh.chainOk': { en: '{n} entries signed by customers’ voice · all safe, nothing changed', hi: '{n} एंट्री ग्राहकों की आवाज़ से पक्की · सब सुरक्षित, कुछ नहीं बदला', gu: '{n} એન્ટ્રી ગ્રાહકોના અવાજથી પાકી · બધું સુરક્ષિત, કંઈ બદલાયું નથી' },
  'kh.chainBad': { en: 'Warning: someone changed a voice-signed entry of {name}', hi: 'सावधान: {name} की आवाज़ से पक्की एंट्री में बदलाव हुआ है', gu: 'સાવધાન: {name} ની અવાજથી પાકી એન્ટ્રીમાં ફેરફાર થયો છે' },
  'kh.filterDues': { en: 'Owe money', hi: 'बाकी वाले', gu: 'બાકીવાળા' },
  'kh.filterSettled': { en: 'All clear', hi: 'साफ़ खाते', gu: 'ચોખ્ખા ખાતા' },
  'kh.noMatch': { en: 'No one found', hi: 'कोई नहीं मिला', gu: 'કોઈ મળ્યું નહીં' },
  'kh.pick': { en: 'Choose a customer to see their khata', hi: 'खाता देखने के लिए ग्राहक चुनें', gu: 'ખાતું જોવા ગ્રાહક પસંદ કરો' },
  'kh.back': { en: 'All customers', hi: 'सभी ग्राहक', gu: 'બધા ગ્રાહકો' },
  'kh.totalUdhar': { en: 'Total udhar', hi: 'कुल उधार', gu: 'કુલ ઉધાર' },
  'kh.totalPaid': { en: 'Total paid', hi: 'कुल जमा', gu: 'કુલ જમા' },
  'kh.gave': { en: 'Gave udhar', hi: 'उधार दिया', gu: 'ઉધાર આપ્યું' },
  'kh.got': { en: 'Got money', hi: 'पैसे मिले', gu: 'પૈસા મળ્યા' },
  'kh.remind': { en: 'Send reminder', hi: 'याद दिलाएँ', gu: 'યાદ અપાવો' },
  'kh.newUdhar': { en: 'New udhar', hi: 'नया उधार', gu: 'નવું ઉધાર' },
  'kh.newPayment': { en: 'Money received', hi: 'पैसे मिले', gu: 'પૈસા મળ્યા' },
  'kh.amount': { en: 'Amount ₹', hi: 'रकम ₹', gu: 'રકમ ₹' },
  'kh.note': { en: 'Note (optional)', hi: 'नोट (ज़रूरी नहीं)', gu: 'નોંધ (જરૂરી નથી)' },
  'kh.amountErr': { en: 'Please enter an amount', hi: 'कृपया रकम लिखें', gu: 'કૃપા કરી રકમ લખો' },
  'kh.noEntries': { en: 'No entries yet', hi: 'अभी कोई एंट्री नहीं', gu: 'હજી કોઈ એન્ટ્રી નથી' },
  'kh.byVoice': { en: 'by voice', hi: 'बोलकर', gu: 'બોલીને' },
  'kh.fromBill': { en: 'from bill', hi: 'बिल से', gu: 'બિલમાંથી' },
  'kh.signed': { en: 'customer’s voice', hi: 'ग्राहक की आवाज़', gu: 'ગ્રાહકનો અવાજ' },
  'kh.bal': { en: 'balance {amt}', hi: 'बाकी {amt}', gu: 'બાકી {amt}' },
  'kh.confirmDelete': { en: 'Delete this entry?', hi: 'यह एंट्री हटाएँ?', gu: 'આ એન્ટ્રી કાઢી નાખવી?' },
  'kh.shareProof': { en: 'Share voice proof', hi: 'आवाज़ का सबूत भेजें', gu: 'અવાજનો પુરાવો મોકલો' },

  // orders
  'ord.new': { en: 'New bill', hi: 'नया बिल', gu: 'નવું બિલ' },
  'ord.customer': { en: 'Customer name', hi: 'ग्राहक का नाम', gu: 'ગ્રાહકનું નામ' },
  'ord.item': { en: 'Item', hi: 'सामान', gu: 'માલ' },
  'ord.qty': { en: 'Quantity', hi: 'कितने', gu: 'કેટલા' },
  'ord.total': { en: 'Total ₹', hi: 'कुल ₹', gu: 'કુલ ₹' },
  'ord.payNow': { en: 'Paid now', hi: 'अभी पैसे दिए', gu: 'હમણાં પૈસા આપ્યા' },
  'ord.onUdhar': { en: 'On udhar', hi: 'उधार पर', gu: 'ઉધાર પર' },
  'ord.empty': { en: 'No bills yet', hi: 'अभी कोई बिल नहीं', gu: 'હજી કોઈ બિલ નથી' },
  'ord.st.pending': { en: 'To deliver', hi: 'देना बाकी', gu: 'આપવાનું બાકી' },
  'ord.st.confirmed': { en: 'Confirmed', hi: 'पक्का', gu: 'પાકું' },
  'ord.st.delivered': { en: 'Delivered', hi: 'दे दिया', gu: 'આપી દીધું' },
  'ord.st.cancelled': { en: 'Cancelled', hi: 'रद्द', gu: 'રદ' },
  'ord.markDelivered': { en: 'Mark delivered', hi: 'दे दिया', gu: 'આપી દીધું' },
  'ord.sendBill': { en: 'Send bill', hi: 'बिल भेजें', gu: 'બિલ મોકલો' },
  'ord.download': { en: 'Download list', hi: 'सूची डाउनलोड', gu: 'યાદી ડાઉનલોડ' },
  'ord.confirmDelete': { en: 'Delete this bill?', hi: 'यह बिल हटाएँ?', gu: 'આ બિલ કાઢી નાખવું?' },

  // customers
  'cus.new': { en: 'New customer', hi: 'नया ग्राहक', gu: 'નવો ગ્રાહક' },
  'cus.name': { en: 'Name', hi: 'नाम', gu: 'નામ' },
  'cus.phone': { en: 'Phone (optional)', hi: 'फ़ोन (ज़रूरी नहीं)', gu: 'ફોન (જરૂરી નથી)' },
  'cus.note': { en: 'Note (optional)', hi: 'नोट (ज़रूरी नहीं)', gu: 'નોંધ (જરૂરી નથી)' },
  'cus.empty': { en: 'No customers yet', hi: 'अभी कोई ग्राहक नहीं', gu: 'હજી કોઈ ગ્રાહક નથી' },
  'cus.hello': { en: 'Namaste {name} ji, greetings from {shop}!', hi: 'नमस्ते {name} जी, {shop} की ओर से राम राम!', gu: 'નમસ્તે {name} જી, {shop} તરફથી જય શ્રી કૃષ્ણ!' },

  // history
  'his.empty': { en: 'Nothing said yet. Tap Vaani and speak.', hi: 'अभी कुछ नहीं कहा। वाणी दबाइए और बोलिए।', gu: 'હજી કંઈ કહ્યું નથી. વાણી દબાવો અને બોલો.' },
  'his.youSaid': { en: 'You said', hi: 'आपने कहा', gu: 'તમે કહ્યું' },
  'his.vaani': { en: 'Vaani', hi: 'वाणी', gu: 'વાણી' },
  'his.st.executed': { en: 'Saved', hi: 'सेव हुआ', gu: 'સેવ થયું' },
  'his.st.cancelled': { en: 'Cancelled', hi: 'रद्द', gu: 'રદ' },
  'his.st.info': { en: 'Answered', hi: 'जवाब दिया', gu: 'જવાબ આપ્યો' },
  'his.st.pending_confirmation': { en: 'Not confirmed', hi: 'पक्का नहीं हुआ', gu: 'પાકું ન થયું' },
  'int.add_udhar': { en: 'Udhar entry', hi: 'उधार लिखा', gu: 'ઉધાર લખ્યું' },
  'int.record_payment': { en: 'Money received', hi: 'पैसे मिले', gu: 'પૈસા મળ્યા' },
  'int.check_balance': { en: 'Asked balance', hi: 'बाकी पूछा', gu: 'બાકી પૂછ્યું' },
  'int.list_dues': { en: 'Who owes', hi: 'किसका बाकी', gu: 'કોના બાકી' },
  'int.create_order': { en: 'New bill', hi: 'नया बिल', gu: 'નવું બિલ' },
  'int.create_reminder': { en: 'Reminder', hi: 'रिमाइंडर', gu: 'રિમાઇન્ડર' },
  'int.add_customer': { en: 'New customer', hi: 'नया ग्राहक', gu: 'નવો ગ્રાહક' },
  'int.show_business_summary': { en: 'Day’s hisaab', hi: 'दिन का हिसाब', gu: 'દિવસનો હિસાબ' },
  'int.play_proof': { en: 'Played voice proof', hi: 'सबूत सुनाया', gu: 'પુરાવો સંભળાવ્યો' },
  'int.undo_last': { en: 'Undo', hi: 'हटाया', gu: 'કાઢી નાખ્યું' },
  'int.list_orders': { en: 'Pending bills', hi: 'बाकी बिल', gu: 'બાકી બિલ' },
  'int.other': { en: 'Talk', hi: 'बातचीत', gu: 'વાતચીત' },

  // settings
  'set.language': { en: 'Language', hi: 'भाषा', gu: 'ભાષા' },
  'set.languageText': { en: 'Vaani listens and replies in this language. You can mix English words.', hi: 'वाणी इसी भाषा में सुनती और बोलती है। अंग्रेज़ी शब्द मिला सकते हैं।', gu: 'વાણી આ ભાષામાં સાંભળે અને બોલે છે. અંગ્રેજી શબ્દો ભેળવી શકો છો.' },
  'set.alerts': { en: 'Reminder alerts', hi: 'रिमाइंडर सूचना', gu: 'રિમાઇન્ડર સૂચના' },
  'set.safety': { en: 'Voice signature safety check', hi: 'आवाज़ से पक्की एंट्री की जाँच', gu: 'અવાજથી પાકી એન્ટ્રીની તપાસ' },
  'set.checkNow': { en: 'Check now', hi: 'अभी जाँचें', gu: 'હમણાં તપાસો' },
  'set.privacy': { en: 'Privacy & keys', hi: 'गोपनीयता', gu: 'ગોપનીયતા' },
  'set.privacyText': {
    en: 'Your khata stays on your own server. Vaani needs no paid AI service or secret key. Speech-to-text uses your browser’s built-in engine (Chrome uses Google’s speech service, so it needs internet). Typing works offline.',
    hi: 'आपका खाता आपके अपने सर्वर पर रहता है। वाणी को किसी पेड AI सेवा या सीक्रेट की की ज़रूरत नहीं। बोलकर लिखना ब्राउज़र का अपना इंजन करता है (Chrome में Google की सेवा, इसलिए इंटरनेट चाहिए)। टाइप करना बिना इंटरनेट चलता है।',
    gu: 'તમારું ખાતું તમારા પોતાના સર્વર પર રહે છે. વાણીને કોઈ પેડ AI સેવા કે સિક્રેટ કીની જરૂર નથી. બોલીને લખવાનું બ્રાઉઝરનું પોતાનું એન્જિન કરે છે (Chrome માં Google ની સેવા, એટલે ઇન્ટરનેટ જોઈએ). ટાઇપ કરવું ઇન્ટરનેટ વગર ચાલે છે.',
  },
  'set.install': { en: 'Use it like an app', hi: 'ऐप की तरह चलाएँ', gu: 'એપની જેમ વાપરો' },
  'set.installText': { en: 'In Chrome on your phone: menu ⋮ → “Add to Home screen”.', hi: 'फ़ोन के Chrome में: मेनू ⋮ → “होम स्क्रीन पर जोड़ें”।', gu: 'ફોનના Chrome માં: મેનુ ⋮ → “હોમ સ્ક્રીન પર ઉમેરો”.' },
  'set.clearChat': { en: 'Clear Vaani conversation', hi: 'वाणी की बातचीत साफ़ करें', gu: 'વાણીની વાતચીત સાફ કરો' },
  // login
  'login.tagline': { en: 'Your voice munim. Speak your khata in English, Hindi or Gujarati.', hi: 'आपकी आवाज़ वाली मुनीम। अंग्रेज़ी, हिंदी या गुजराती में खाता बोलिए।', gu: 'તમારી અવાજવાળી મુનીમ. અંગ્રેજી, હિન્દી કે ગુજરાતીમાં ખાતું બોલો.' },
  'login.login': { en: 'Login ID', hi: 'लॉगिन आईडी', gu: 'લૉગિન આઈડી' },
  'login.password': { en: 'Password', hi: 'पासवर्ड', gu: 'પાસવર્ડ' },
  'login.submit': { en: 'Log in', hi: 'लॉगिन करें', gu: 'લૉગિન કરો' },
  'login.wait': { en: 'Logging in…', hi: 'लॉगिन हो रहा है…', gu: 'લૉગિન થાય છે…' },
  'login.demo': { en: 'Try a demo account', hi: 'डेमो खाता आज़माएँ', gu: 'ડેમો ખાતું અજમાવો' },
  'login.demoShop1': { en: 'Cloth shop', hi: 'कपड़े की दुकान', gu: 'કાપડની દુકાન' },
  'login.demoShop2': { en: 'Kirana store', hi: 'किराना स्टोर', gu: 'કરિયાણાની દુકાન' },
  'login.demoAdmin': { en: 'Admin (all shops)', hi: 'एडमिन (सभी दुकानें)', gu: 'એડમિન (બધી દુકાનો)' },
  'login.server': { en: 'Server address', hi: 'सर्वर पता', gu: 'સર્વર સરનામું' },
  'login.serverHelp': { en: 'Only needed when the app and the server are hosted separately (e.g. GitHub Pages + Render).', hi: 'तभी ज़रूरी जब ऐप और सर्वर अलग जगह हों (जैसे GitHub Pages + Render)।', gu: 'ત્યારે જ જરૂરી જ્યારે એપ અને સર્વર અલગ જગ્યાએ હોય (જેમ કે GitHub Pages + Render).' },
  'login.noServer': { en: 'Cannot reach the server. Check the server address below, or start it with “docker compose up”.', hi: 'सर्वर से जुड़ नहीं पा रहे। नीचे सर्वर पता जाँचें या “docker compose up” से चालू करें।', gu: 'સર્વર સાથે જોડાઈ શકતા નથી. નીચે સર્વર સરનામું તપાસો અથવા “docker compose up” થી ચાલુ કરો.' },
  'set.account': { en: 'Account', hi: 'खाता (लॉगिन)', gu: 'એકાઉન્ટ (લૉગિન)' },
  'set.logout': { en: 'Log out', hi: 'लॉग आउट', gu: 'લૉગ આઉટ' },
  'set.changePw': { en: 'Change password', hi: 'पासवर्ड बदलें', gu: 'પાસવર્ડ બદલો' },
  'set.oldPw': { en: 'Current password', hi: 'अभी का पासवर्ड', gu: 'હાલનો પાસવર્ડ' },
  'set.newPw': { en: 'New password (6+ letters)', hi: 'नया पासवर्ड (6+ अक्षर)', gu: 'નવો પાસવર્ડ (6+ અક્ષર)' },
  'set.pwChanged': { en: 'Password changed', hi: 'पासवर्ड बदल गया', gu: 'પાસવર્ડ બદલાઈ ગયો' },
  'set.autoLang': { en: 'Reply in the language I speak', hi: 'जिस भाषा में बोलूँ, उसी में जवाब', gu: 'જે ભાષામાં બોલું, તેમાં જવાબ' },
  'set.autoLangText': { en: 'Speak English, Hindi or Gujarati, even mixed in one sentence. Vaani answers in the language you used and switches the app to it.', hi: 'अंग्रेज़ी, हिंदी या गुजराती बोलिए, एक वाक्य में मिलाकर भी। वाणी उसी भाषा में जवाब देगी और ऐप की भाषा बदल देगी।', gu: 'અંગ્રેજી, હિન્દી કે ગુજરાતી બોલો, એક વાક્યમાં ભેળવીને પણ. વાણી એ જ ભાષામાં જવાબ આપશે અને એપની ભાષા બદલી દેશે.' },
  'voice.switched': { en: 'Switched to English', hi: 'हिंदी में बदल दिया', gu: 'ગુજરાતીમાં બદલી દીધું' },
} satisfies Record<string, Entry>;

export type I18nKey = keyof typeof D;

export const hasKey = (k: string): k is I18nKey => k in D;

export function t(lang: LanguageCode, key: I18nKey, vars?: Record<string, string | number>): string {
  const entry: Entry | undefined = D[key];
  if (!entry) return String(key);
  let s = lang === 'hi-IN' ? entry.hi : lang === 'gu-IN' ? entry.gu : entry.en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export const useT = (lang: LanguageCode) => (key: I18nKey, vars?: Record<string, string | number>) => t(lang, key, vars);

/** "2 min ago" / "3 घंटे पहले" for 'YYYY-MM-DD HH:MM:SS' timestamps. */
export function ago(lang: LanguageCode, ts: string): string {
  const d = new Date(ts.replace(' ', 'T'));
  if (isNaN(d.getTime())) return ts;
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return t(lang, 'common.justNow');
  if (mins < 60) return t(lang, 'common.ago.min', { n: mins });
  if (mins < 60 * 24) return t(lang, 'common.ago.hr', { n: Math.round(mins / 60) });
  return t(lang, 'common.ago.day', { n: Math.round(mins / 1440) });
}

/** "Today 4:30 PM" / "कल 11:00 AM" / "28 Nov 2:00 PM" for an ISO due time. */
export function whenLabel(lang: LanguageCode, iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((dayD - day0) / 86400000);
  const clock = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const dayText =
    diff === 0 ? t(lang, 'common.today') : diff === 1 ? t(lang, 'common.tomorrow') : diff === -1 ? t(lang, 'common.yesterday') : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${dayText} ${clock}`;
}

/** Phone's local time as 'YYYY-MM-DDTHH:mm:ss' (what the server compares against). */
export function localNowISO(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
