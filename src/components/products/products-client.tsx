'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/database.types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { TableEmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'
import { useToast } from '@/components/ui/toast'
import { createProduct, updateProduct, toggleProductStatus } from '@/actions/products'
import { IceCream, Plus } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'

interface ProductFormData {
  name:           string
  description:    string
  flavor:         string
  price_per_unit: string
  unit_label:     string
  stock:          string
  min_stock:      string
}

const EMPTY_FORM: ProductFormData = {
  name: '', description: '', flavor: '', price_per_unit: '', unit_label: 'paquete x12', stock: '0', min_stock: '10',
}

const PAGE_SIZE = 10

export function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const router = useRouter()
  const [products, setProducts]   = useState(initialProducts)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<Product | null>(null)
  const [form, setForm]           = useState<ProductFormData>(EMPTY_FORM)
  const [loading, setLoading]     = useState(false)
  const { show, ToastComponent }  = useToast()

  // Sync with server data after router.refresh()
  useEffect(() => { setProducts(initialProducts) }, [initialProducts])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.flavor.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setForm({
      name:           product.name,
      description:    product.description ?? '',
      flavor:         product.flavor,
      price_per_unit: String(product.price_per_unit),
      unit_label:     product.unit_label,
      stock:          String(product.stock),
      min_stock:      String(product.min_stock),
    })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result   = editing
      ? await updateProduct(editing.id, formData)
      : await createProduct(formData)
    setLoading(false)

    if (!result.success) { show(result.error, 'error'); return }

    if (editing) {
      // Update local state immediately — don't rely on router.refresh() re-initializing useState
      const updated: Product = {
        ...editing,
        name:           String(formData.get('name')          ?? editing.name),
        description:    String(formData.get('description')   ?? '') || null,
        flavor:         String(formData.get('flavor')        ?? editing.flavor),
        price_per_unit: parseFloat(String(formData.get('price_per_unit') ?? editing.price_per_unit)),
        unit_label:     String(formData.get('unit_label')   ?? editing.unit_label),
        stock:          parseInt(String(formData.get('stock')      ?? editing.stock), 10),
        min_stock:      parseInt(String(formData.get('min_stock')  ?? editing.min_stock), 10),
        updated_at:     new Date().toISOString(),
      }
      setProducts(ps => ps.map(p => p.id === editing.id ? updated : p))
      show('Producto actualizado.', 'success')
    } else {
      // For new products, refresh to get the DB-generated id
      router.refresh()
      show('Producto creado.', 'success')
    }

    setModalOpen(false)
  }

  async function handleToggle(product: Product) {
    const result = await toggleProductStatus(product.id, !product.is_active)
    if (!result.success) { show(result.error, 'error'); return }
    setProducts(ps => ps.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p))
    show(`Producto ${product.is_active ? 'desactivado' : 'activado'}.`, 'success')
  }

  return (
    <>
      {ToastComponent}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-slate-400 text-sm mt-0.5">{products.length} sabores registrados</p>
        </div>
        <Button id="btn-create-product" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          id="search-products"
          placeholder="Buscar por nombre o sabor…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          containerClassName="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Producto</TableHead>
              <TableHead>Sabor</TableHead>
              <TableHead className="text-right min-w-[80px]">Precio</TableHead>
              <TableHead className="text-right min-w-[80px]">Stock</TableHead>
              <TableHead className="min-w-[90px]">Estado</TableHead>
              <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {filtered.length === 0
              ? (
                <TableEmptyState
                  colSpan={6}
                  icon={<IceCream className="w-6 h-6" />}
                  title="No se encontraron productos"
                  description={search ? 'Intenta con otro nombre o sabor.' : 'Crea tu primer producto usando el botón de arriba.'}
                  action={!search ? (
                    <Button size="sm" variant="outline" onClick={openCreate}>
                      <Plus className="w-3.5 h-3.5" /> Nuevo Producto
                    </Button>
                  ) : undefined}
                />
              )
              : paginated.map(product => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-xs text-slate-500">{product.unit_label}</p>
                    </div>
                  </TableCell>
                  <TableCell>{product.flavor}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-400">
                    {formatCurrency(product.price_per_unit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={product.stock <= product.min_stock ? 'text-rose-400 font-semibold' : 'text-white'}>
                      {product.stock}
                    </span>
                    {product.stock <= product.min_stock && (
                      <span className="ml-1 text-xs text-rose-500">⚠ bajo</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? 'success' : 'default'}>
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button id={`btn-edit-${product.id}`} size="sm" variant="outline" onClick={() => openEdit(product)}>
                        Editar
                      </Button>
                      <Button
                        id={`btn-toggle-${product.id}`}
                        size="sm"
                        variant={product.is_active ? 'destructive' : 'success'}
                        onClick={() => handleToggle(product)}
                      >
                        {product.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            }
          </TableBody>
        </Table>

        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          label="productos"
        />
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Nombre" required className="col-span-2">
                  <Input name="name" defaultValue={form.name} placeholder="Helado de Fresa Premium" required />
                </FormField>
                <FormField label="Sabor" required>
                  <Input name="flavor" defaultValue={form.flavor} placeholder="Fresa" required />
                </FormField>
                <FormField label="Unidad" required>
                  <Input name="unit_label" defaultValue={form.unit_label} placeholder="paquete x12" required />
                </FormField>
                <FormField label="Precio por unidad" required>
                  <Input name="price_per_unit" type="number" step="0.01" min="0.01" defaultValue={form.price_per_unit} placeholder="85.00" required />
                </FormField>
                <FormField label="Stock inicial">
                  <Input name="stock" type="number" min="0" defaultValue={form.stock} placeholder="0" />
                </FormField>
                <FormField label="Stock mínimo (alerta)">
                  <Input name="min_stock" type="number" min="0" defaultValue={form.min_stock} placeholder="10" />
                </FormField>
                <FormField label="Descripción" className="col-span-2">
                  <textarea
                    name="description"
                    defaultValue={form.description}
                    rows={2}
                    placeholder="Descripción opcional del producto…"
                    className="flex w-full rounded-xl border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 resize-none"
                  />
                </FormField>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" loading={loading}>
                {editing ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
