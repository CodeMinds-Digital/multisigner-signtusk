'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  HelpCircle,
  Tag,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Star,
  Folder,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface FAQCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color: string
  display_order: number
  is_active: boolean
  faq_count: number
  created_at: string
}

interface FAQItem {
  id: string
  category_id?: string
  question: string
  answer: string
  answer_format: string
  keywords: string[]
  tags: string[]
  display_order: number
  is_published: boolean
  is_featured: boolean
  view_count: number
  helpful_count: number
  not_helpful_count: number
  created_at: string
  category?: {
    id: string
    name: string
    color: string
    icon?: string
  }
}

interface FAQManagerProps {
  onFAQsChange?: (faqs: FAQItem[]) => void
}

export function FAQManager({ onFAQsChange }: FAQManagerProps) {
  const [categories, setCategories] = useState<FAQCategory[]>([])
  const [faqItems, setFaqItems] = useState<FAQItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [editingFAQ, setEditingFAQ] = useState<FAQItem | null>(null)

  // Form state for FAQ
  const [faqQuestion, setFaqQuestion] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')
  const [faqAnswerFormat, setFaqAnswerFormat] = useState('text')
  const [faqCategoryId, setFaqCategoryId] = useState('')
  const [faqKeywords, setFaqKeywords] = useState<string[]>([''])
  const [faqTags, setFaqTags] = useState<string[]>([''])
  const [faqIsPublished, setFaqIsPublished] = useState(true)
  const [faqIsFeatured, setFaqIsFeatured] = useState(false)

  // Form state for category
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [categoryIcon, setCategoryIcon] = useState('')
  const [categoryColor, setCategoryColor] = useState('#3B82F6')

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/send/faq/categories?active_only=false')
      const data = await response.json()

      if (data.success) {
        setCategories(data.categories)
      } else {
        toast.error('Failed to load FAQ categories')
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Failed to load FAQ categories')
    }
  }

  // Fetch FAQ items
  const fetchFAQItems = async () => {
    setLoading(true)
    try {
      let url = '/api/send/faq/items?published_only=false'
      if (selectedCategory !== 'all') {
        url += `&category_id=${selectedCategory}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setFaqItems(data.faq_items)
        onFAQsChange?.(data.faq_items)
      } else {
        toast.error('Failed to load FAQ items')
      }
    } catch (error) {
      console.error('Error fetching FAQ items:', error)
      toast.error('Failed to load FAQ items')
    } finally {
      setLoading(false)
    }
  }

  // Search FAQ items
  const searchFAQs = async () => {
    if (!searchQuery.trim()) {
      fetchFAQItems()
      return
    }

    setLoading(true)
    try {
      let url = `/api/send/faq/search?q=${encodeURIComponent(searchQuery)}`
      if (selectedCategory !== 'all') {
        url += `&category_id=${selectedCategory}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setFaqItems(data.results)
      } else {
        toast.error('Failed to search FAQ items')
      }
    } catch (error) {
      console.error('Error searching FAQ items:', error)
      toast.error('Failed to search FAQ items')
    } finally {
      setLoading(false)
    }
  }

  // Create category
  const createCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      const response = await fetch('/api/send/faq/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
          icon: categoryIcon,
          color: categoryColor
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Category created successfully')
        setShowCategoryDialog(false)
        resetCategoryForm()
        fetchCategories()
      } else {
        toast.error(data.error || 'Failed to create category')
      }
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Failed to create category')
    }
  }

  // Create FAQ item
  const createFAQItem = async () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.error('Question and answer are required')
      return
    }

    try {
      const response = await fetch('/api/send/faq/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category_id: faqCategoryId || null,
          question: faqQuestion,
          answer: faqAnswer,
          answer_format: faqAnswerFormat,
          keywords: faqKeywords.filter(k => k.trim()),
          tags: faqTags.filter(t => t.trim()),
          is_published: faqIsPublished,
          is_featured: faqIsFeatured
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('FAQ created successfully')
        setShowCreateDialog(false)
        resetFAQForm()
        fetchFAQItems()
      } else {
        toast.error(data.error || 'Failed to create FAQ')
      }
    } catch (error) {
      console.error('Error creating FAQ:', error)
      toast.error('Failed to create FAQ')
    }
  }

  // Reset forms
  const resetFAQForm = () => {
    setFaqQuestion('')
    setFaqAnswer('')
    setFaqAnswerFormat('text')
    setFaqCategoryId('')
    setFaqKeywords([''])
    setFaqTags([''])
    setFaqIsPublished(true)
    setFaqIsFeatured(false)
  }

  const resetCategoryForm = () => {
    setCategoryName('')
    setCategoryDescription('')
    setCategoryIcon('')
    setCategoryColor('#3B82F6')
  }

  // Get helpfulness ratio
  const getHelpfulnessRatio = (helpful: number, notHelpful: number) => {
    const total = helpful + notHelpful
    if (total === 0) return 0
    return Math.round((helpful / total) * 100)
  }

  // Filter FAQ items based on search
  const filteredFAQs = faqItems.filter(faq => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      faq.question.toLowerCase().includes(query) ||
      faq.answer.toLowerCase().includes(query) ||
      faq.keywords.some(k => k.toLowerCase().includes(query)) ||
      faq.tags.some(t => t.toLowerCase().includes(query))
    )
  })

  useEffect(() => {
    fetchCategories()
    fetchFAQItems()
  }, [selectedCategory])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchFAQs()
      } else {
        fetchFAQItems()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">FAQ Management</h3>
          <p className="text-sm text-gray-500">
            Create and manage frequently asked questions for your documents
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={resetCategoryForm}>
                <Folder className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create FAQ Category</DialogTitle>
                <DialogDescription>
                  Organize your FAQs into categories for better navigation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input
                    id="category-name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g., Getting Started"
                  />
                </div>

                <div>
                  <Label htmlFor="category-description">Description (Optional)</Label>
                  <Textarea
                    id="category-description"
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                    placeholder="Brief description of this category"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category-icon">Icon (Optional)</Label>
                    <Input
                      id="category-icon"
                      value={categoryIcon}
                      onChange={(e) => setCategoryIcon(e.target.value)}
                      placeholder="📚 or icon-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category-color">Color</Label>
                    <Input
                      id="category-color"
                      type="color"
                      value={categoryColor}
                      onChange={(e) => setCategoryColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCategoryDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createCategory}>
                    Create Category
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetFAQForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create FAQ Item</DialogTitle>
                <DialogDescription>
                  Add a new frequently asked question and answer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="faq-question">Question</Label>
                  <Input
                    id="faq-question"
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                    placeholder="What is your question?"
                  />
                </div>

                <div>
                  <Label htmlFor="faq-answer">Answer</Label>
                  <Textarea
                    id="faq-answer"
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                    placeholder="Provide a detailed answer..."
                    className="min-h-[120px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="faq-category">Category</Label>
                    <Select value={faqCategoryId} onValueChange={setFaqCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.icon && <span className="mr-2">{category.icon}</span>}
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="faq-format">Answer Format</Label>
                    <Select value={faqAnswerFormat} onValueChange={setFaqAnswerFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Plain Text</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Keywords (for search)</Label>
                  <div className="space-y-2">
                    {faqKeywords.map((keyword, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={keyword}
                          onChange={(e) => {
                            const newKeywords = [...faqKeywords]
                            newKeywords[index] = e.target.value
                            setFaqKeywords(newKeywords)
                          }}
                          placeholder={`Keyword ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newKeywords = faqKeywords.filter((_, i) => i !== index)
                            setFaqKeywords(newKeywords.length > 0 ? newKeywords : [''])
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFaqKeywords([...faqKeywords, ''])}
                    >
                      Add Keyword
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CustomSwitch
                      checked={faqIsPublished}
                      onCheckedChange={setFaqIsPublished}
                    />
                    <Label htmlFor="faq-published">Published</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CustomSwitch
                      checked={faqIsFeatured}
                      onCheckedChange={setFaqIsFeatured}
                    />
                    <Label htmlFor="faq-featured">Featured</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createFAQItem}>
                    Create FAQ
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FAQs..."
              className="pl-10"
            />
          </div>
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon && <span className="mr-2">{category.icon}</span>}
                {category.name} ({category.faq_count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* FAQ Items */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredFAQs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500">
              {searchQuery ? 'No FAQs found matching your search' : 'No FAQs found'}
            </p>
            <p className="text-sm text-gray-400">Create your first FAQ to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFAQs.map((faq) => (
            <Card key={faq.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{faq.question}</h4>
                      {faq.is_featured && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                      {!faq.is_published && (
                        <Badge variant="outline">Draft</Badge>
                      )}
                      {faq.category && (
                        <Badge
                          variant="outline"
                          style={{ borderColor: faq.category.color, color: faq.category.color }}
                        >
                          {faq.category.icon && <span className="mr-1">{faq.category.icon}</span>}
                          {faq.category.name}
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">{faq.answer}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {faq.view_count} views
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        {faq.helpful_count}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsDown className="h-4 w-4" />
                        {faq.not_helpful_count}
                      </div>
                      <div>
                        {getHelpfulnessRatio(faq.helpful_count, faq.not_helpful_count)}% helpful
                      </div>
                      {faq.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          {faq.tags.slice(0, 2).join(', ')}
                          {faq.tags.length > 2 && ` +${faq.tags.length - 2}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
