"use client";

import { useEffect, useState } from "react";
import Navbar from "../components/navbar";

interface Item {
  id: number;
  barcode: string;
  name: string;
  quantity_per_unit: string;
  unit: string;
  type_name: string;
  location_name: string;
  notes: string;
  current_qty: number;
}

export default function ManagePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Item>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "location" | "type">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/inventory/list');
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
      }
    } catch (e) {
      setMessage("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditValues(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      // Find original item to compare quantity
      const originalItem = items.find(i => i.id === editingId);
      const originalQty = originalItem?.current_qty || 0;
      const newQty = editValues.current_qty !== undefined ? parseInt(String(editValues.current_qty)) : originalQty;
      const qtyDifference = newQty - originalQty;

      // Update item via API
      const res = await fetch(`/api/inventory/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: editValues.name,
          notes: editValues.notes,
          quantity_per_unit: editValues.quantity_per_unit,
          unit: editValues.unit,
          type_name: editValues.type_name,
          location_name: editValues.location_name,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // If quantity changed, create an ADJUST transaction
        if (qtyDifference !== 0) {
          const adjustRes = await fetch(`/api/inventory/adjust`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: editingId,
              delta: qtyDifference,
              note: `Adjusted from ${originalQty} to ${newQty}`,
            }),
          });
          const adjustData = await adjustRes.json();
          if (!adjustRes.ok || !adjustData.success) {
            setMessage("Item updated but adjustment failed: " + (adjustData.error || "unknown"));
          } else {
            setMessage("Item updated with adjustment");
          }
        } else {
          setMessage("Item updated");
        }
        await fetchItems();
        setEditingId(null);
      } else {
        setMessage("Failed to update: " + (data.error || "unknown"));
      }
    } catch (e) {
      setMessage("Error: " + String(e));
    }
  };

  const deleteItem = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/inventory/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Item deleted");
        await fetchItems();
      } else {
        setMessage("Failed to delete: " + (data.error || "unknown"));
      }
    } catch (e) {
      setMessage("Error: " + String(e));
    }
  };

  const filteredItems = items.filter(item =>
    (item.name.toLowerCase().includes(filter.toLowerCase()) ||
    item.barcode.toLowerCase().includes(filter.toLowerCase())) &&
    (filterLocation === "" || item.location_name === filterLocation) &&
    (filterType === "" || item.type_name === filterType)
  ).sort((a, b) => {
    let aVal: string;
    let bVal: string;
    
    if (sortBy === "name") {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortBy === "location") {
      aVal = (a.location_name || "").toLowerCase();
      bVal = (b.location_name || "").toLowerCase();
    } else {
      aVal = (a.type_name || "").toLowerCase();
      bVal = (b.type_name || "").toLowerCase();
    }
    
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const uniqueLocations = Array.from(new Set(items.map(item => item.location_name).filter(Boolean))).sort();
  const uniqueTypes = Array.from(new Set(items.map(item => item.type_name).filter(Boolean))).sort();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Management</h1>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            {message}
            <button onClick={() => setMessage(null)} className="ml-2 underline">✕</button>
          </div>
        )}

        {/* Filters and Sort */}
        <div className="mb-6 space-y-3">
          {/* Search Filter */}
          <input
            type="text"
            placeholder="Search by name or barcode..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm"
            style={{ borderColor: '#d1d5db' }}
          />
          
          {/* Location and Type Filters, Sort Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="">All Locations</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as "name" | "location" | "type")}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="name">Name</option>
                <option value="location">Location</option>
                <option value="type">Type</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as "asc" | "desc")}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b" style={{ borderColor: '#d1d5db' }}>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Barcode</th>
                  <th 
                    className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      if (sortBy === "name") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else setSortBy("name");
                    }}
                  >
                    Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      if (sortBy === "type") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else setSortBy("type");
                    }}
                  >
                    Type {sortBy === "type" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th 
                    className="px-4 py-3 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      if (sortBy === "location") setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      else setSortBy("location");
                    }}
                  >
                    Location {sortBy === "location" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Per Unit</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Unit</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#d1d5db' }}>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.barcode}</td>
                      <td className="px-4 py-3 font-medium">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.name || ""}
                            onChange={e => setEditValues({...editValues, name: e.target.value})}
                            className="w-full px-2 py-1 border rounded text-sm"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        ) : (
                          item.name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.type_name || ""}
                            onChange={e => setEditValues({...editValues, type_name: e.target.value})}
                            className="w-full px-2 py-1 border rounded text-sm"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        ) : (
                          item.type_name || "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.location_name || ""}
                            onChange={e => setEditValues({...editValues, location_name: e.target.value})}
                            className="w-full px-2 py-1 border rounded text-sm"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        ) : (
                          item.location_name || "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">
                        {editingId === item.id ? (
                          <input
                            type="number"
                            value={editValues.current_qty || ""}
                            onChange={e => setEditValues({...editValues, current_qty: parseInt(e.target.value) || 0})}
                            className="w-full px-2 py-1 border rounded text-sm text-center"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        ) : (
                          item.current_qty
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.quantity_per_unit || ""}
                            onChange={e => setEditValues({...editValues, quantity_per_unit: e.target.value})}
                            className="w-full px-2 py-1 border rounded text-sm"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        ) : (
                          item.quantity_per_unit || "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingId === item.id ? (
                          <input
                            type="text"
                            value={editValues.unit || ""}
                            onChange={e => setEditValues({...editValues, unit: e.target.value})}
                            className="w-full px-2 py-1 border rounded text-sm"
                            style={{ borderColor: '#d1d5db' }}
                          />
                        ) : (
                          item.unit || "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {editingId === item.id ? (
                          <textarea
                            value={editValues.notes || ""}
                            onChange={e => setEditValues({...editValues, notes: e.target.value})}
                            className="w-full px-2 py-1 border rounded text-sm"
                            style={{ borderColor: '#d1d5db' }}
                            rows={2}
                          />
                        ) : (
                          item.notes ? (
                            <div className="relative inline-block group">
                              <span className="cursor-help text-blue-600 font-semibold">ℹ️</span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded whitespace-normal max-w-xs break-words opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {item.notes}
                              </div>
                            </div>
                          ) : (
                            "—"
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          {editingId === item.id ? (
                            <>
                              <button
                                onClick={saveEdit}
                                className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-2 py-1 bg-gray-400 text-white rounded text-xs font-medium hover:bg-gray-500"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(item)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteItem(item.id, item.name)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} found
        </div>
        </div>
      </div>
    </div>
  );
}
