import React, { useState, useEffect, useCallback } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import CategoryCard from "../components/categories/CategoryCard";
import AddCategoryModal from "../components/categories/AddCategoryModal";
import TransactionDetailModal from "../components/categories/TransactionDetailModal";
import TransactionDetailSheet from "../components/transactions/TransactionDetailSheet";
import { categoryService, Category as ApiCategory } from "../services/category.service";
import { pickCategoryIcon } from "../services/category-presets";
import { transactionService, Transaction as TxType } from "../services/transaction.service";

type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  count: number;
};

const PAGE_SIZE = 5;

export default function CategoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [mutatingCategoryId, setMutatingCategoryId] = useState<string | null>(null);

  // Transaction detail modal state
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [categoryTxs, setCategoryTxs] = useState<TxType[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TxType | null>(null);

  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryService.getAll();
      setCategories(res.categories.map((c: ApiCategory) => ({
        id: c.id,
        name: c.name,
        type: c.type.toLowerCase() as "income" | "expense",
        icon: c.icon as any,
        count: c._count?.transactions || 0,
      })));
    } catch (err) {
      console.error('Load categories error:', err);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, categories.length]);

  const handleTransactionDeleted = useCallback((transactionId: string) => {
    setCategoryTxs((current) => current.filter((tx) => tx.id !== transactionId));
    setSelectedTransaction(null);
    void loadCategories();
    if (selectedCategory) {
      void transactionService
        .getAll({ categoryId: selectedCategory.id, limit: 20 })
        .then((res) => setCategoryTxs(res.transactions))
        .catch(() => undefined);
    }
  }, [loadCategories, selectedCategory]);

  if (!fontsLoaded) return <View style={styles.loading} />;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredCategories = categories.filter((c) => {
    const matchesType = filter === "all" || c.type === filter;
    const matchesSearch = c.name.toLowerCase().includes(normalizedSearch);
    return matchesType && matchesSearch;
  });
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedCategories = filteredCategories.slice(pageStart, pageStart + PAGE_SIZE);
  const showPagination = filteredCategories.length > PAGE_SIZE;

  const columns = width >= 1080 ? 3 : width >= 700 ? 2 : 1;
  const cardWidth = columns === 3 ? "31.9%" : columns === 2 ? "48.8%" : "100%";

  const handleAddCategory = async (newCat: { name: string; type: "income" | "expense" }) => {
    try {
      const icon = pickCategoryIcon(newCat.type, categories.length);
      await categoryService.create({
        name: newCat.name,
        type: newCat.type.toUpperCase() as 'INCOME' | 'EXPENSE',
        icon,
      });
      await loadCategories();
    } catch (err: any) {
      console.error('Add category error:', err);
      Alert.alert("Gagal", err?.message || "Gagal menambahkan kategori");
      throw err;
    }
  };

  const handleStartEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsEditModalVisible(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalVisible(false);
    setEditingCategory(null);
  };

  const handleEditCategory = async (updatedCategory: { name: string; type: "income" | "expense" }) => {
    if (!editingCategory) return;

    try {
      setMutatingCategoryId(editingCategory.id);
      await categoryService.update(editingCategory.id, { name: updatedCategory.name });
      setCategories((current) =>
        current.map((category) =>
          category.id === editingCategory.id
            ? { ...category, name: updatedCategory.name }
            : category
        )
      );
      await loadCategories();
    } catch (err: any) {
      console.error('Edit category error:', err);
      Alert.alert("Gagal", err?.message || "Gagal mengubah kategori");
      throw err;
    } finally {
      setMutatingCategoryId(null);
    }
  };

  const handleCategoryPress = async (category: Category) => {
    setSelectedCategory(category);
    setIsDetailVisible(true);
    try {
      const res = await transactionService.getAll({ categoryId: category.id, limit: 20 });
      setCategoryTxs(res.transactions);
    } catch {
      setCategoryTxs([]);
    }
  };

  const handleDetailClose = () => {
    setIsDetailVisible(false);
    setSelectedTransaction(null);
    setTimeout(() => { setSelectedCategory(null); setCategoryTxs([]); }, 300);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      "Hapus kategori?",
      `Kategori "${category.name}" akan dihapus dari daftar aktif. Transaksi lama tetap tersimpan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              setMutatingCategoryId(category.id);
              await categoryService.delete(category.id);
              setCategories((current) => current.filter((item) => item.id !== category.id));
              if (selectedCategory?.id === category.id) {
                handleDetailClose();
              }
              await loadCategories();
            } catch (err: any) {
              console.error('Delete category error:', err);
              Alert.alert("Gagal", err?.message || "Gagal menghapus kategori");
            } finally {
              setMutatingCategoryId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D2349" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={["#0D2349", "#12406A", "#0C8C76"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerOrb} />
          <View style={styles.topRow}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={18} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Kategori Transaksi</Text>
              <Text style={styles.headerSub}>Kelola kategori pemasukan dan pengeluaran</Text>
            </View>
          </View>

          <View style={styles.insightRow}>
            <View style={styles.insightCard}>
              <Text style={styles.insightValue}>{categories.length}</Text>
              <Text style={styles.insightLabel}>kategori aktif</Text>
            </View>
            <View style={styles.insightCard}>
              <Text style={styles.insightValue}>
                {categories.reduce((s, c) => s + c.count, 0)}
              </Text>
              <Text style={styles.insightLabel}>total transaksi</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Toolbar */}
        <View style={styles.toolbarCard}>
          <View style={styles.searchShell}>
            <Feather name="search" size={18} color="#64748B" style={styles.searchIcon} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Cari kategori..." placeholderTextColor="#94A3B8" style={styles.searchInput} />
          </View>

          <View style={styles.filterRow}>
            {(["all", "income", "expense"] as const).map((opt) => {
              const active = filter === opt;
              return (
                <Pressable key={opt} style={[styles.filterBtn, active && styles.filterBtnActive]} onPress={() => setFilter(opt)}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {opt === "all" ? "Semua" : opt === "income" ? "Pemasukan" : "Pengeluaran"}
                  </Text>
                </Pressable>
              );
            })}

            <Pressable style={styles.addBtn} onPress={() => setIsModalVisible(true)}>
              <LinearGradient colors={["#12406A", "#0C8C76"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGrad}>
                <Feather name="plus" size={18} color="#FFF" />
                <Text style={styles.addBtnText}>Tambah</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Grid */}
        {filteredCategories.length > 0 ? (
          <>
            <View style={styles.gridMeta}>
              <Text style={styles.gridMetaText}>
                Menampilkan {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, filteredCategories.length)} dari {filteredCategories.length} kategori
              </Text>
            </View>

            <View style={styles.grid}>
              {paginatedCategories.map((c) => (
                <View key={c.id} style={{ width: cardWidth }}>
                  <CategoryCard
                    icon={c.icon}
                    name={c.name}
                    type={c.type}
                    count={c.count}
                    onPress={() => handleCategoryPress(c)}
                    onEdit={() => handleStartEditCategory(c)}
                    onDelete={() => handleDeleteCategory(c)}
                    isMutating={mutatingCategoryId === c.id}
                  />
                </View>
              ))}
            </View>

            {showPagination && (
              <View style={styles.pagination}>
                <Pressable
                  style={[styles.pageIconBtn, safePage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safePage === 1}
                >
                  <Feather name="chevron-left" size={18} color={safePage === 1 ? "#94A3B8" : "#12406A"} />
                </Pressable>
                <Text style={styles.pageText}>Halaman {safePage} dari {totalPages}</Text>
                <Pressable
                  style={[styles.pageIconBtn, safePage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safePage === totalPages}
                >
                  <Feather name="chevron-right" size={18} color={safePage === totalPages ? "#94A3B8" : "#12406A"} />
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Feather name="search" size={22} color="#12406A" />
            <Text style={styles.emptyTitle}>Kategori tidak ditemukan</Text>
            <Text style={styles.emptyText}>Coba ubah kata kunci pencarian atau filter.</Text>
          </View>
        )}
      </ScrollView>

      <AddCategoryModal visible={isModalVisible} onClose={() => setIsModalVisible(false)} onAdd={handleAddCategory} />

      <AddCategoryModal
        visible={isEditModalVisible}
        onClose={handleCloseEditModal}
        onAdd={handleEditCategory}
        initialName={editingCategory?.name ?? ""}
        initialType={editingCategory?.type ?? "income"}
        lockType
        title="Edit kategori"
        subtitle="Ubah nama kategori tanpa mengubah riwayat transaksinya."
        submitLabel="Simpan perubahan"
      />

      {/* Transaction Detail Bottom Sheet */}
      <TransactionDetailModal
        visible={isDetailVisible}
        onClose={handleDetailClose}
        categoryName={selectedCategory?.name ?? ""}
        categoryIcon={selectedCategory?.icon ?? "help-circle-outline"}
        categoryType={selectedCategory?.type ?? "expense"}
        transactions={categoryTxs}
        onTransactionPress={setSelectedTransaction}
      />

      <TransactionDetailSheet
        visible={selectedTransaction !== null}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDeleted={handleTransactionDeleted}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EEF3F8" },
  loading: { flex: 1, backgroundColor: "#EEF3F8" },
  scroll: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 32 },

  header: { borderRadius: 30, paddingHorizontal: 22, paddingTop: 22, paddingBottom: 22, overflow: "hidden" },
  headerOrb: { position: "absolute", top: -110, right: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.08)" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#FFF" },
  headerSub: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.68)", marginTop: 2 },

  insightRow: { marginTop: 18, flexDirection: "row", gap: 12 },
  insightCard: {
    minWidth: 140, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  insightValue: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#FFF" },
  insightLabel: { marginTop: 2, fontSize: 12, fontFamily: "Poppins_400Regular", color: "rgba(255,255,255,0.68)" },

  toolbarCard: {
    marginTop: 18, borderRadius: 22, backgroundColor: "#FFF", padding: 16,
    shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  searchShell: {
    minHeight: 50, borderRadius: 16, backgroundColor: "#F8FAFC",
    borderWidth: 1, borderColor: "#D9E2EC", justifyContent: "center",
  },
  searchIcon: { position: "absolute", left: 14, top: 15 },
  searchInput: { minHeight: 50, paddingLeft: 42, paddingRight: 16, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#102A43" },

  filterRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#D9E2EC",
  },
  filterBtnActive: { backgroundColor: "rgba(12,140,118,0.12)", borderColor: "rgba(12,140,118,0.24)" },
  filterText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#64748B" },
  filterTextActive: { color: "#0C8C76" },

  addBtn: { borderRadius: 14, overflow: "hidden", marginLeft: "auto" },
  addBtnGrad: { minHeight: 44, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  addBtnText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#FFF" },

  gridMeta: { marginTop: 16, paddingHorizontal: 2 },
  gridMetaText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#64748B" },
  grid: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 14 },
  pagination: {
    marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
  },
  pageIconBtn: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "#D9E2EC", alignItems: "center", justifyContent: "center",
  },
  pageBtnDisabled: { backgroundColor: "#F8FAFC" },
  pageText: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#102A43" },

  emptyCard: {
    marginTop: 18, borderRadius: 24, backgroundColor: "#FFF", paddingHorizontal: 24, paddingVertical: 36,
    alignItems: "center", shadowColor: "#0F172A", shadowOpacity: 0.07, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  emptyTitle: { marginTop: 14, fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#102A43" },
  emptyText: { marginTop: 6, textAlign: "center", fontSize: 13, fontFamily: "Poppins_400Regular", color: "#64748B" },
});
