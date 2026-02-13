import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#0F172A',
  surface: '#1E293B',
  primary: '#8B5CF6',
  secondary: '#F43F5E',
  accent: '#10B981',
  white: '#FFFFFF',
  textGray: '#94A3B8',
  star: '#FBBF24',
};

const CATEGORY_MAP: { [key: string]: string[] } = {
  'Sneakers': ['sneaker', 'casual', 'lifestyle'],
  'Sports': ['running', 'walking', 'training', 'sport', 'athletic', 'gym', 'outdoor'],
  'Casual': ['casual', 'loafer', 'slip-on', 'moccasin', 'sandal'],
  'Brogues': ['brogue', 'formal', 'derby', 'oxford', 'wedding', 'leather'],
};

export default function App() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<{ [key: string]: any[] }>({});

  const [showOrders, setShowOrders] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddress, setCAddress] = useState('');

  // રિવ્યુ માટેના સ્ટેટ્સ
  const [reviewName, setReviewName] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  // હિસ્ટ્રી સર્ચ માટેનું સ્ટેટ
  const [historySearch, setHistorySearch] = useState('');

  // પેમેન્ટ અને આર્કાઇવ માટેના સ્ટેટ્સ
  const [showPayment, setShowPayment] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]); // માર્કેટિંગ માટે ગ્રાહક ડેટાબેઝ
  const [archivedOrders, setArchivedOrders] = useState<any[]>([]); // જૂના ઓર્ડર્સનો ઇતિહાસ

  // સ્ટોર મેનેજર (Admin/AI Agent) સ્ટેટ્સ
  const [showStoreManager, setShowStoreManager] = useState(false);
  const [productOverrides, setProductOverrides] = useState<{ [key: string]: any }>({});
  const [editPrice, setEditPrice] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  const categories = ['All', ...Object.keys(CATEGORY_MAP)];

  useEffect(() => {
    fetchProducts();
    loadOrders();
    loadReviews();
    loadHistory(); // માર્કેટિંગ ડેટા લોડ કરો
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [mensRes, womensRes] = await Promise.all([
        fetch('https://dummyjson.com/products/category/mens-shoes'),
        fetch('https://dummyjson.com/products/category/womens-shoes')
      ]);
      const mensData = await mensRes.json();
      const womensData = await womensRes.json();
      const combined = [...mensData.products, ...womensData.products];
      setProducts(combined);
      setFilteredProducts(combined);
      setLoading(false);
    } catch (err: any) {
      setError("નેટવર્ક કનેક્શન તપાસો.");
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    const saved = await AsyncStorage.getItem('footwa_orders');
    if (saved) setOrders(JSON.parse(saved));
  };

  const loadReviews = async () => {
    const saved = await AsyncStorage.getItem('footwa_reviews');
    if (saved) setReviews(JSON.parse(saved));
  };

  const loadHistory = async () => {
    const savedOrders = await AsyncStorage.getItem('footwa_archived');
    const savedCustomers = await AsyncStorage.getItem('footwa_marketing');
    const savedOverrides = await AsyncStorage.getItem('footwa_product_overrides');

    if (savedOrders) setArchivedOrders(JSON.parse(savedOrders));
    if (savedCustomers) setCustomerHistory(JSON.parse(savedCustomers));
    if (savedOverrides) setProductOverrides(JSON.parse(savedOverrides));
  };

  const deleteSingleOrder = async (orderId: string) => {
    Alert.alert(
      "ઓર્ડર ડિલીટ",
      "શું તમે આ ઓર્ડર કાઢી નાખવા માંગો છો?",
      [
        { text: "ના", style: "cancel" },
        {
          text: "હા",
          onPress: async () => {
            const updatedOrders = orders.filter(o => o.orderId !== orderId);
            setOrders(updatedOrders);
            await AsyncStorage.setItem('footwa_orders', JSON.stringify(updatedOrders));
          }
        }
      ]
    );
  };

  const handleOrderClick = (product: any) => {
    setSelectedProduct(product);
    setShowCheckout(true);
  };

  const handleReviewClick = (product: any) => {
    setSelectedProduct(product);
    setShowReviewModal(true);
  };

  const placeOrder = async () => {
    if (!cName || !cPhone || !cAddress) {
      Alert.alert("ભૂલ", "વિગતો અધૂરી છે.");
      return;
    }
    // હવે ડાયરેક્ટ ઓર્ડર નહીં, પહેલા પેમેન્ટ પૂછો
    setShowCheckout(false);
    setShowPayment(true);
  };

  const confirmPayment = async (method: string) => {
    const newOrder = {
      orderId: `ORD${Math.floor(Math.random() * 100000)}`,
      customerName: cName,
      customerPhone: cPhone,
      customerAddress: cAddress,
      productTitle: selectedProduct.title,
      price: Math.round(selectedProduct.price * 80),
      orderDate: new Date().toLocaleDateString(),
      status: `પેમેન્ટ સફળ (${method})`,
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    await AsyncStorage.setItem('footwa_orders', JSON.stringify(updated));

    setShowPayment(false);
    setCName(''); setCPhone(''); setCAddress('');
    Alert.alert("🎉 ઓર્ડર સફળ રહ્યો!", "તમારું પાર્સલ ટૂંક સમયમાં તૈયાર થશે.");
  };

  // ઓર્ડર પૂરો કરો અને હિસ્ટ્રીમાં મોકલો (Marketing)
  const completeOrder = async (order: any) => {
    Alert.alert(
      "કન્ફર્મ કરો",
      "શું ઓર્ડર પૂરો થઈ ગયો છે? આ ડેટા હિસ્ટ્રીમાં સેવ થશે.",
      [
        { text: "ના" },
        {
          text: "હા",
          onPress: async () => {
            // ઓર્ડર લિસ્ટમાંથી કાઢો
            const remainingOrders = orders.filter(o => o.orderId !== order.orderId);
            setOrders(remainingOrders);
            await AsyncStorage.setItem('footwa_orders', JSON.stringify(remainingOrders));

            // આર્કાઇવમાં ઉમેરો
            const newArchive = [order, ...archivedOrders];
            setArchivedOrders(newArchive);
            await AsyncStorage.setItem('footwa_archived', JSON.stringify(newArchive));

            // માર્કેટિંગ ડેટાબેઝ અપડેટ કરો (Unique Customers)
            const customerExists = customerHistory.find(c => c.phone === order.customerPhone);
            if (!customerExists) {
              const newCustomer = { name: order.customerName, phone: order.customerPhone, address: order.customerAddress };
              const updatedMarketing = [newCustomer, ...customerHistory];
              setCustomerHistory(updatedMarketing);
              await AsyncStorage.setItem('footwa_marketing', JSON.stringify(updatedMarketing));
            }
          }
        }
      ]
    );
  };

  const submitReview = async () => {
    if (!reviewName || !reviewComment) {
      Alert.alert("ભૂલ", "ભલે તમે થોડું લખો, પણ વિગત આપો.");
      return;
    }
    const productId = selectedProduct.id.toString();
    const newReview = { name: reviewName, comment: reviewComment, date: new Date().toLocaleDateString() };
    const updatedReviews = { ...reviews, [productId]: [newReview, ...(reviews[productId] || [])] };
    setReviews(updatedReviews);
    await AsyncStorage.setItem('footwa_reviews', JSON.stringify(updatedReviews));
    setReviewName(''); setReviewComment('');
    setShowReviewModal(false);
    Alert.alert("આભાર", "તમારો રિવ્યુ સફળતાપૂર્વક સાચવવામાં આવ્યો છે.");
  };

  // ડેટા એક્સપોર્ટ (Export to JSON simulation)
  const exportHistory = async () => {
    try {
      const dataToExport = {
        orders: archivedOrders,
        marketing: customerHistory,
        exportDate: new Date().toISOString()
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);

      // રીયલ એપમાં અહીં expo-sharing અથવા file-system વપરાય
      // અત્યારે આપણે વિદ્યાર્થીઓને બતાવવા માટે એલર્ટ અને કોન્સોલ લોગ કરીએ છીએ
      console.log("--- EXPORT DATA ---");
      console.log(jsonString);

      Alert.alert(
        "એક્સપોર્ટ સફળ!",
        "તમારા ૧૨,૦૦૦+ ઓર્ડરનો ડેટા ફાઈલ (JSON) તરીકે તૈયાર છે. આ ફાઈલ તમે ગ્રાહકોને મેસેજ કરવા માટે વાપરી શકો છો.",
        [{ text: "સમજાયું" }]
      );
    } catch (err) {
      Alert.alert("ભૂલ", "એક્સપોર્ટ કરવામાં સમસ્યા આવી.");
    }
  };

  const saveProductOverride = async () => {
    if (!selectedProduct) return;
    const pid = selectedProduct.id.toString();
    const updated = {
      ...productOverrides,
      [pid]: {
        price: editPrice ? parseFloat(editPrice) : (productOverrides[pid]?.price || selectedProduct.price),
        image: editImage || (productOverrides[pid]?.image || selectedProduct.thumbnail),
        website: editWebsite || (productOverrides[pid]?.website || `https://www.google.com/search?q=${selectedProduct.brand}+${selectedProduct.title}`)
      }
    };
    setProductOverrides(updated);
    await AsyncStorage.setItem('footwa_product_overrides', JSON.stringify(updated));
    setSelectedProduct(null);
    setEditPrice(''); setEditImage(''); setEditWebsite('');
    Alert.alert("સફળ", "પ્રોડક્ટની વિગતો બદલાઈ ગઈ છે.");
  };

  const openWebsite = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("ભૂલ", "આ લીંક ખોલી શકાય તેમ નથી.");
      }
    } catch (err) {
      Alert.alert("ભૂલ", "વેબસાઈટ લોડ કરવામાં સમસ્યા આવી.");
    }
  };

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    const filtered = products.filter((item) =>
      item.title.toLowerCase().includes(text.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(text.toLowerCase()))
    );
    setFilteredProducts(filtered);
    setActiveCategory('All');
  }, [products]);

  const handleCategoryPress = useCallback((category: string) => {
    setActiveCategory(category);
    setSearchQuery('');
    if (category === 'All') {
      setFilteredProducts(products);
    } else {
      const keywords = CATEGORY_MAP[category] || [category.toLowerCase()];
      const filtered = products.filter((item) => {
        const title = item.title.toLowerCase();
        const cat = (item.category || '').toLowerCase();
        return keywords.some(key => title.includes(key) || cat.includes(key));
      });
      setFilteredProducts(filtered);
    }
  }, [products]);

  const renderProduct = ({ item }: { item: any }) => {
    const override = productOverrides[item.id.toString()] || {};
    const displayPrice = override.price || item.price;
    const displayImage = override.image || item.thumbnail;
    const productReviews = reviews[item.id.toString()] || [];

    return (
      <View style={styles.card}>
        <View style={styles.imageOverlay}>
          <Image source={{ uri: displayImage }} style={styles.productImage} resizeMode="contain" />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.productName} numberOfLines={1}>{item.title}</Text>
          <TouchableOpacity onPress={() => openWebsite(override.website || `https://www.google.com/search?q=${item.brand}+${item.title}`)}>
            <Text style={[styles.productBrand, { color: COLORS.primary, textDecorationLine: 'underline' }]}>{item.brand || 'Premium'} 🌐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reviewSummary} onPress={() => handleReviewClick(item)}>
            <Text style={{ color: COLORS.star, fontSize: 12 }}>★ {productReviews.length} Reviews</Text>
          </TouchableOpacity>
          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>₹ {Math.round(displayPrice * 80)}</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => handleOrderClick({ ...item, price: displayPrice })}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const HeaderComponent = useMemo(() => (
    <View style={styles.header}>
      <View style={styles.topHeader}>
        <Text style={styles.headerTitle}>FOOTWARE</Text>
        <TouchableOpacity style={styles.profileIcon} onPress={() => setShowOrders(true)}>
          <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: 'bold' }}>ઓર્ડર</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search sneakers..." placeholderTextColor={COLORS.textGray} value={searchQuery} onChangeText={handleSearch} />
      </View>
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((item) => (
            <TouchableOpacity key={item} style={[styles.categoryButton, activeCategory === item && styles.activeCategoryButton]} onPress={() => handleCategoryPress(item)}>
              <Text style={[styles.categoryText, activeCategory === item && styles.activeCategoryText]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <Text style={styles.sectionTitle}>{searchQuery ? `Results for "${searchQuery}"` : "Shoes Selection"}</Text>
    </View>
  ), [searchQuery, activeCategory, handleSearch, handleCategoryPress, categories]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.container}>
            {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} /> : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={HeaderComponent}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        </KeyboardAvoidingView>

        {/* રિવ્યુ મોડલ (Review Modal) */}
        <Modal visible={showReviewModal} animationType="slide" transparent={true}>
          <View style={styles.overlay}>
            <View style={[styles.checkoutBox, { maxHeight: '80%' }]}>
              <Text style={styles.checkoutTitle}>રિવ્યુ અને રેટિંગ</Text>
              <ScrollView>
                <Text style={{ color: COLORS.white, fontWeight: 'bold', marginBottom: 10 }}>બધા રિવ્યુ ({reviews[selectedProduct?.id.toString()]?.length || 0})</Text>
                {(reviews[selectedProduct?.id.toString()] || []).map((r: any, i: number) => (
                  <View key={i} style={styles.reviewItem}>
                    <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{r.name}</Text>
                    <Text style={{ color: COLORS.white, fontSize: 13, marginVertical: 4 }}>{r.comment}</Text>
                    <Text style={{ color: COLORS.textGray, fontSize: 10 }}>{r.date}</Text>
                  </View>
                ))}

                <View style={{ height: 1, backgroundColor: '#334155', marginVertical: 15 }} />
                <Text style={{ color: COLORS.accent, marginBottom: 10 }}>તમારો રિવ્યુ લખો:</Text>
                <TextInput style={styles.modalInput} placeholder="તમારું નામ" placeholderTextColor={COLORS.textGray} value={reviewName} onChangeText={setReviewName} />
                <TextInput style={[styles.modalInput, { height: 60 }]} placeholder="તમારો અનુભવ..." placeholderTextColor={COLORS.textGray} multiline value={reviewComment} onChangeText={setReviewComment} />
              </ScrollView>
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.surface }]} onPress={() => setShowReviewModal(false)}><Text style={{ color: COLORS.white }}>બંધ કરો</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.primary }]} onPress={submitReview}><Text style={{ color: COLORS.white, fontWeight: 'bold' }}>રિવ્યુ આપો</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Checkout Modal */}
        <Modal visible={showCheckout} animationType="fade" transparent={true}>
          <View style={styles.overlay}>
            <View style={styles.checkoutBox}>
              <Text style={styles.checkoutTitle}>ઓર્ડરની વિગતો</Text>
              <TextInput style={styles.modalInput} placeholder="નામ" placeholderTextColor={COLORS.textGray} value={cName} onChangeText={setCName} />
              <TextInput style={styles.modalInput} placeholder="મોબાઈલ" placeholderTextColor={COLORS.textGray} keyboardType="phone-pad" value={cPhone} onChangeText={setCPhone} />
              <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="પૂરું સરનામું" placeholderTextColor={COLORS.textGray} multiline value={cAddress} onChangeText={setCAddress} />
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.surface }]} onPress={() => setShowCheckout(false)}><Text style={{ color: COLORS.white }}>રદ કરો</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.accent }]} onPress={placeOrder}><Text style={{ color: COLORS.white, fontWeight: 'bold' }}>ઓર્ડર ફાઈનલ કરો</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Admin Orders Modal */}
        <Modal visible={showOrders} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.white }]}>ગ્રાહક ઓર્ડર હિસ્ટ્રી</Text>
              <TouchableOpacity onPress={() => { setShowOrders(false); setHistorySearch(''); }}>
                <Text style={{ color: COLORS.secondary, fontWeight: 'bold' }}>બંધ કરો</Text>
              </TouchableOpacity>
            </View>

            {/* હિસ્ટ્રી સર્ચ બાર */}
            <View style={[styles.searchContainer, { marginHorizontal: 20, marginTop: 10, height: 45 }]}>
              <Text style={{ marginRight: 8 }}>👤</Text>
              <TextInput
                style={[styles.searchInput, { fontSize: 14 }]}
                placeholder="નામ કે ફોનથી હિસ્ટ્રી શોધો..."
                placeholderTextColor={COLORS.textGray}
                value={historySearch}
                onChangeText={setHistorySearch}
              />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {orders
                .filter(o =>
                  o.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
                  o.customerPhone.includes(historySearch)
                )
                .map((order, index) => (
                  <View key={index} style={styles.orderCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>ID: {order.orderId}</Text>
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => completeOrder(order)} style={{ marginRight: 15 }}>
                          <Text style={{ fontSize: 18 }}>✅</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteSingleOrder(order.orderId)}>
                          <Text style={{ fontSize: 18 }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={{ color: COLORS.white, marginVertical: 5 }}>ગ્રાહક: {order.customerName} ({order.customerPhone})</Text>
                    <Text style={{ color: COLORS.textGray, fontSize: 12 }}>સરનામું: {order.customerAddress}</Text>
                    <Text style={{ color: COLORS.accent, marginTop: 5 }}>વસ્તુ: {order.productTitle} - ₹{order.price}</Text>
                  </View>
                ))}

              <View style={{ height: 2, backgroundColor: COLORS.primary, marginVertical: 20 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={[styles.checkoutTitle, { fontSize: 18, marginBottom: 0 }]}>📢 માર્કેટિંગ ડેટાબેઝ</Text>
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  onPress={exportHistory}
                >
                  <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 11 }}>એક્સપોર્ટ (Export)</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.orderCard}>
                <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>સીસ્ટમ સ્ટેટ્સ:</Text>
                <Text style={{ color: COLORS.textGray }}>કુલ ગ્રાહકો: {customerHistory.length}</Text>
                <Text style={{ color: COLORS.textGray }}>કુલ જૂના ઓર્ડર: {archivedOrders.length}</Text>
                <TouchableOpacity
                  style={{ marginTop: 10, backgroundColor: COLORS.primary, padding: 10, borderRadius: 8, alignItems: 'center' }}
                  onPress={() => { setShowOrders(false); setShowStoreManager(true); }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>સ્ટોર મેનેજર ખોલો (Admin Mode)</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: COLORS.textGray, marginVertical: 10, fontSize: 12 }}>ગ્રાહકોની યાદી:</Text>
              {customerHistory.map((c, i) => (
                <View key={i} style={[styles.orderCard, { borderColor: COLORS.accent }]}>
                  <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>{c.name}</Text>
                  <Text style={{ color: COLORS.accent }}>📞 {c.phone}</Text>
                  <Text style={{ color: COLORS.textGray, fontSize: 12 }}>{c.address}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.clearButton}
                onPress={async () => {
                  Alert.alert(
                    "ઓર્ડર સાફ કરો",
                    "શું તમે માત્ર એક્ટિવ ઓર્ડર સાફ કરવા માંગો છો? (હિસ્ટ્રી અને માર્કેટિંગ ડેટા સુરક્ષિત રહેશે)",
                    [
                      { text: "ના" },
                      {
                        text: "હા",
                        onPress: async () => {
                          await AsyncStorage.removeItem('footwa_orders');
                          setOrders([]);
                          Alert.alert("સફળ", "એક્ટિવ ઓર્ડર લિસ્ટ સાફ કરવામાં આવ્યું છે.");
                        }
                      }
                    ]
                  );
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>એક્ટિવ ઓર્ડર સાફ કરો (Clear Active Orders)</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* સ્ટોર મેનેજર (Store Manager / Admin Agent) */}
        <Modal visible={showStoreManager} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: COLORS.white }]}>સ્ટોર મેનેજર (Admin Agent)</Text>
              <TouchableOpacity onPress={() => setShowStoreManager(false)}>
                <Text style={{ color: COLORS.secondary, fontWeight: 'bold' }}>બંધ કરો</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={{ color: COLORS.textGray, marginBottom: 20 }}>તમે અહીંથી પગરખાંના ભાવ અને ફોટા બદલી શકો છો.</Text>

              {selectedProduct ? (
                <View style={styles.checkoutBox}>
                  <Text style={{ color: COLORS.primary, fontWeight: 'bold', marginBottom: 10 }}>Edit: {selectedProduct.title}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="નવો ભાવ (USD)"
                    placeholderTextColor={COLORS.textGray}
                    keyboardType="numeric"
                    value={editPrice}
                    onChangeText={setEditPrice}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="ફોટાની નવી Link (URL)"
                    placeholderTextColor={COLORS.textGray}
                    value={editImage}
                    onChangeText={setEditImage}
                  />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="બ્રાન્ડની વેબસાઈટ (URL)"
                    placeholderTextColor={COLORS.textGray}
                    value={editWebsite}
                    onChangeText={setEditWebsite}
                  />
                  <View style={styles.modalActionRow}>
                    <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.surface }]} onPress={() => setSelectedProduct(null)}><Text style={{ color: COLORS.white }}>રદ કરો</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.modalButton, { backgroundColor: COLORS.accent }]} onPress={saveProductOverride}><Text style={{ color: COLORS.white, fontWeight: 'bold' }}>સાચવો</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                products.map((p, i) => (
                  <View key={i} style={[styles.orderCard, { flexDirection: 'row', alignItems: 'center' }]}>
                    <Image source={{ uri: productOverrides[p.id.toString()]?.image || p.thumbnail }} style={{ width: 50, height: 50, borderRadius: 10, marginRight: 15 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>{p.title}</Text>
                      <Text style={{ color: COLORS.accent }}>₹ {Math.round((productOverrides[p.id.toString()]?.price || p.price) * 80)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setSelectedProduct(p); setEditPrice((productOverrides[p.id.toString()]?.price || p.price).toString()); setEditImage(productOverrides[p.id.toString()]?.image || p.thumbnail); }}
                      style={{ backgroundColor: COLORS.primary, padding: 8, borderRadius: 8 }}
                    >
                      <Text style={{ color: COLORS.white, fontSize: 12 }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* પેમેન્ટ સિમ્યુલેશન મોડલ (Payment Modal) */}
        <Modal visible={showPayment} animationType="fade" transparent={true}>
          <View style={styles.overlay}>
            <View style={styles.checkoutBox}>
              <Text style={styles.checkoutTitle}>પેમેન્ટ સિલેક્ટ કરો</Text>
              <TouchableOpacity style={styles.modalInput} onPress={() => confirmPayment('Google Pay')}>
                <Text style={{ color: COLORS.white, textAlign: 'center' }}>Google Pay (GPay)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalInput} onPress={() => confirmPayment('PhonePe')}>
                <Text style={{ color: COLORS.white, textAlign: 'center' }}>PhonePe</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalInput} onPress={() => confirmPayment('Cash on Delivery')}>
                <Text style={{ color: COLORS.white, textAlign: 'center' }}>Cash on Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowPayment(false)} style={{ marginTop: 10 }}>
                <Text style={{ color: COLORS.secondary, textAlign: 'center' }}>રદ કરો</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <StatusBar style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 10, paddingHorizontal: 15, paddingBottom: 15 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },
  profileIcon: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.primary },
  searchContainer: { backgroundColor: COLORS.surface, borderRadius: 15, paddingHorizontal: 15, marginBottom: 20, height: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  searchIcon: { marginRight: 10 },
  searchInput: { fontSize: 16, color: COLORS.white, flex: 1 },
  categoryContainer: { marginBottom: 15 },
  categoryButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22, backgroundColor: COLORS.surface, marginRight: 10 },
  activeCategoryButton: { backgroundColor: COLORS.primary },
  categoryText: { fontWeight: 'bold', color: COLORS.textGray },
  activeCategoryText: { color: COLORS.white },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  container: { flex: 1 },
  listContainer: { paddingHorizontal: 10, paddingBottom: 20 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 12, margin: 5, width: (width / 2) - 15, borderWidth: 1, borderColor: '#334155' },
  imageOverlay: { backgroundColor: '#334155', borderRadius: 15, padding: 10, marginBottom: 10 },
  productImage: { width: '100%', height: 110 },
  infoContainer: { paddingHorizontal: 2 },
  productName: { fontSize: 15, fontWeight: 'bold', color: COLORS.white },
  productBrand: { fontSize: 12, color: COLORS.textGray, marginBottom: 5 },
  reviewSummary: { marginBottom: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.white },
  addButton: { backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  checkoutBox: { backgroundColor: COLORS.surface, width: '90%', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#334155' },
  checkoutTitle: { color: COLORS.white, fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  modalInput: { backgroundColor: COLORS.background, borderRadius: 12, padding: 12, color: COLORS.white, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
  modalButton: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, marginLeft: 10 },
  reviewItem: { backgroundColor: COLORS.background, padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  orderCard: { backgroundColor: COLORS.surface, padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  clearButton: { backgroundColor: COLORS.secondary, padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
});
