'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  Tag,
  X,
  Search,
  Filter,
  Palette,
  Hash,
  Check,
  ChevronsUpDown,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface Tag {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  usage_count: number
  is_system: boolean
  group?: {
    id: string
    name: string
    color: string
  }
}

interface DocumentTag {
  id: string
  document_id: string
  tag_id: string
  assigned_at: string
  tag: Tag
}

interface DocumentTagsManagerProps {
  documentId?: string
  selectedTags?: string[]
  onTagsChange?: (tagIds: string[]) => void
  showCreateTag?: boolean
  compact?: boolean
}

export function DocumentTagsManager({
  documentId,
  selectedTags = [],
  onTagsChange,
  showCreateTag = true,
  compact = false
}: DocumentTagsManagerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [documentTags, setDocumentTags] = useState<DocumentTag[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTagSelector, setShowTagSelector] = useState(false)

  // Form state for creating tags
  const [tagName, setTagName] = useState('')
  const [tagDescription, setTagDescription] = useState('')
  const [tagColor, setTagColor] = useState('#3B82F6')
  const [tagIcon, setTagIcon] = useState('')

  // Current selected tags (for controlled mode)
  const [currentSelectedTags, setCurrentSelectedTags] = useState<string[]>(selectedTags)

  // Predefined colors for tags
  const tagColors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#F97316', '#84CC16', '#06B6D4', '#6366F1'
  ]

  // Fetch all available tags
  const fetchTags = async () => {
    try {
      const response = await fetch('/api/send/tags?include_system=true&sort_by=usage_count')
      const data = await response.json()

      if (data.success) {
        setTags(data.tags)
      } else {
        toast.error('Failed to load tags')
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      toast.error('Failed to load tags')
    }
  }

  // Fetch document tags (if documentId provided)
  const fetchDocumentTags = async () => {
    if (!documentId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/send/documents/${documentId}/tags`)
      const data = await response.json()

      if (data.success) {
        setDocumentTags(data.document_tags)
        const tagIds = data.document_tags.map((dt: DocumentTag) => dt.tag_id)
        setCurrentSelectedTags(tagIds)
        onTagsChange?.(tagIds)
      } else {
        toast.error('Failed to load document tags')
      }
    } catch (error) {
      console.error('Error fetching document tags:', error)
      toast.error('Failed to load document tags')
    } finally {
      setLoading(false)
    }
  }

  // Create new tag
  const createTag = async () => {
    if (!tagName.trim()) {
      toast.error('Tag name is required')
      return
    }

    try {
      const response = await fetch('/api/send/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: tagName,
          description: tagDescription,
          color: tagColor,
          icon: tagIcon
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Tag created successfully')
        setShowCreateDialog(false)
        resetForm()
        fetchTags()
      } else {
        toast.error(data.error || 'Failed to create tag')
      }
    } catch (error) {
      console.error('Error creating tag:', error)
      toast.error('Failed to create tag')
    }
  }

  // Assign tags to document
  const assignTags = async (tagIds: string[]) => {
    if (!documentId) {
      // For controlled mode without documentId
      setCurrentSelectedTags(tagIds)
      onTagsChange?.(tagIds)
      return
    }

    try {
      const response = await fetch(`/api/send/documents/${documentId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tag_ids: tagIds,
          replace_all: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setCurrentSelectedTags(tagIds)
        onTagsChange?.(tagIds)
        fetchDocumentTags()
        toast.success('Tags updated successfully')
      } else {
        toast.error(data.error || 'Failed to update tags')
      }
    } catch (error) {
      console.error('Error assigning tags:', error)
      toast.error('Failed to update tags')
    }
  }

  // Remove tag from document
  const removeTag = async (tagId: string) => {
    const newTagIds = currentSelectedTags.filter(id => id !== tagId)
    await assignTags(newTagIds)
  }

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    const newTagIds = currentSelectedTags.includes(tagId)
      ? currentSelectedTags.filter(id => id !== tagId)
      : [...currentSelectedTags, tagId]

    assignTags(newTagIds)
  }

  // Reset form
  const resetForm = () => {
    setTagName('')
    setTagDescription('')
    setTagColor('#3B82F6')
    setTagIcon('')
  }

  // Filter tags based on search
  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get selected tag objects
  const selectedTagObjects = tags.filter(tag => currentSelectedTags.includes(tag.id))

  useEffect(() => {
    fetchTags()
    if (documentId) {
      fetchDocumentTags()
    }
  }, [documentId])

  useEffect(() => {
    setCurrentSelectedTags(selectedTags)
  }, [selectedTags])

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Selected Tags Display */}
        <div className="flex flex-wrap gap-1">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              style={{ borderColor: tag.color, color: tag.color }}
              className="text-xs"
            >
              {tag.icon && <span className="mr-1">{tag.icon}</span>}
              {tag.name}
              <button
                onClick={() => removeTag(tag.id)}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Tag Selector */}
        <Popover open={showTagSelector} onOpenChange={setShowTagSelector}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Tag className="h-3 w-3 mr-1" />
              Add Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {filteredTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => toggleTag(tag.id)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox
                      checked={currentSelectedTags.includes(tag.id)}
                      onCheckedChange={() => { }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.icon && <span>{tag.icon}</span>}
                    <span className="flex-1">{tag.name}</span>
                    {tag.is_system && (
                      <Badge variant="outline" className="text-xs">
                        System
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Document Tags</h3>
          <p className="text-sm text-gray-500">
            Organize and categorize your documents with tags
          </p>
        </div>

        {showCreateTag && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tag</DialogTitle>
                <DialogDescription>
                  Create a new tag to organize your documents.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tag-name">Tag Name</Label>
                  <Input
                    id="tag-name"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    placeholder="e.g., Important"
                  />
                </div>

                <div>
                  <Label htmlFor="tag-description">Description (Optional)</Label>
                  <Input
                    id="tag-description"
                    value={tagDescription}
                    onChange={(e) => setTagDescription(e.target.value)}
                    placeholder="Brief description of this tag"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tag-icon">Icon (Optional)</Label>
                    <Input
                      id="tag-icon"
                      value={tagIcon}
                      onChange={(e) => setTagIcon(e.target.value)}
                      placeholder="🏷️ or icon-name"
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-2">
                      {tagColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setTagColor(color)}
                          className={`w-6 h-6 rounded-full border-2 ${tagColor === color ? 'border-gray-800' : 'border-gray-300'
                            }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createTag}>
                    Create Tag
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Current Document Tags */}
      {documentId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current Tags</CardTitle>
            <CardDescription>
              Tags assigned to this document
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : selectedTagObjects.length === 0 ? (
              <p className="text-gray-500 text-sm">No tags assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedTagObjects.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                    className="flex items-center gap-1"
                  >
                    {tag.icon && <span>{tag.icon}</span>}
                    {tag.name}
                    <button
                      onClick={() => removeTag(tag.id)}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Available Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Tags</CardTitle>
          <CardDescription>
            Click to assign tags to this document
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tags..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Tags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredTags.map((tag) => {
              const isSelected = currentSelectedTags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`p-3 rounded-lg border text-left transition-colors ${isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.icon && <span className="text-sm">{tag.icon}</span>}
                    <span className="font-medium text-sm">{tag.name}</span>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 ml-auto" />}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{tag.usage_count} documents</span>
                    {tag.is_system && (
                      <Badge variant="outline" className="text-xs">
                        System
                      </Badge>
                    )}
                    {tag.group && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: tag.group.color, color: tag.group.color }}
                      >
                        {tag.group.name}
                      </Badge>
                    )}
                  </div>

                  {tag.description && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {tag.description}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {filteredTags.length === 0 && (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500">
                {searchQuery ? 'No tags found matching your search' : 'No tags available'}
              </p>
              <p className="text-sm text-gray-400">
                {showCreateTag && 'Create your first tag to get started'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
