const translations = {
  en: {
    orderConfirmed: 'Order Confirmed',
    orderShipped: 'Order Shipped',
    orderDelivered: 'Order Delivered',
    orderCancelled: 'Order Cancelled',
    lowStock: 'Low Stock Alert',
    newOrder: 'New Order Received',
    welcome: 'Welcome to Tech Store',
    paymentReceived: 'Payment Received',
    refundProcessed: 'Refund Processed',
    accountCreated: 'Account Created',
    passwordReset: 'Password Reset Request',
  },
  fr: {
    orderConfirmed: 'Commande Confirmée',
    orderShipped: 'Commande Expédiée',
    orderDelivered: 'Commande Livrée',
    orderCancelled: 'Commande Annulée',
    lowStock: 'Alerte Stock Bas',
    newOrder: 'Nouvelle Commande Reçue',
    welcome: 'Bienvenue sur Tech Store',
    paymentReceived: 'Paiement Reçu',
    refundProcessed: 'Remboursement Traité',
    accountCreated: 'Compte Créé',
    passwordReset: 'Demande de Réinitialisation',
  },
  ar: {
    orderConfirmed: 'تم تأكيد الطلب',
    orderShipped: 'تم شحن الطلب',
    orderDelivered: 'تم توصيل الطلب',
    orderCancelled: 'تم إلغاء الطلب',
    lowStock: 'تنبيه مخزون منخفض',
    newOrder: 'طلب جديد',
    welcome: 'مرحباً بكم في Tech Store',
    paymentReceived: 'تم استلام الدفع',
    refundProcessed: 'تمت معالجة الاسترداد',
    accountCreated: 'تم إنشاء الحساب',
    passwordReset: 'طلب إعادة تعيين كلمة المرور',
  },
};

const t = (key, lang = 'en') => {
  return translations[lang]?.[key] || translations.en[key] || key;
};

module.exports = { t, translations };
