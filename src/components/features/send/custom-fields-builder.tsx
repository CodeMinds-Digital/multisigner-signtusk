'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  GripVertical,
  Type,
  Mail,
  Phone,
  Hash,
  Calendar,
  Link,
  CheckSquare,
  List,
  AlignLeft
} from 'lucide-react'
import { toast } from 'sonner'
// import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface CustomField {
  id: string
  name: string
  label: string
  field_type: string
  description?: string
  placeholder?: string
  is_required: boolean
  is_active: boolean
  field_config: any
  validation_rules: any
  display_order: number
  group_name?: string
  created_at: string
}

interface CustomFieldsBuilderProps {
  onFieldsChange?: (fields: CustomField[]) => void
}

export function CustomFieldsBuilder({ onFieldsChange }: CustomFieldsBuilderProps) {
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)

  // Form state
  const [fieldName, setFieldName] = useState('')
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [fieldDescription, setFieldDescription] = useState('')
  const [fieldPlaceholder, setFieldPlaceholder] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [selectOptions, setSelectOptions] = useState<string[]>([''])

  // Field type options
  const fieldTypes = [
    { value: 'text', label: 'Text', icon: Type },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'url', label: 'URL', icon: Link },
    { value: 'textarea', label: 'Long Text', icon: AlignLeft },
    { value: 'select', label: 'Dropdown', icon: List },
    { value: 'multiselect', label: 'Multi-Select', icon: List },
    { value: 'checkbox', label: 'Checkbox', icon: CheckSquare }
  ]

  // Fetch custom fields
  const fetchCustomFields = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/send/custom-fields?active_only=false')
      const data = await response.json()

      if (data.success) {
        setCustomFields(data.custom_fields)
        onFieldsChange?.(data.custom_fields)
      } else {
        toast.error('Failed to load custom fields')
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error)
      toast.error('Failed to load custom fields')
    } finally {
      setLoading(false)
    }
  }

  // Create custom field
  const createCustomField = async () => {
    if (!fieldName.trim() || !fieldLabel.trim()) {
      toast.error('Field name and label are required')
      return
    }

    const fieldConfig: any = {}
    if (fieldType === 'select' || fieldType === 'multiselect') {
      const options = selectOptions.filter(opt => opt.trim())
      if (options.length === 0) {
        toast.error('At least one option is required for select fields')
        return
      }
      fieldConfig.options = options
    }

    try {
      const response = await fetch('/api/send/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fieldName,
          label: fieldLabel,
          field_type: fieldType,
          description: fieldDescription,
          placeholder: fieldPlaceholder,
          is_required: isRequired,
          field_config: fieldConfig,
          group_name: groupName,
          display_order: customFields.length
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Custom field created successfully')
        setShowCreateDialog(false)
        resetForm()
        fetchCustomFields()
      } else {
        toast.error(data.error || 'Failed to create custom field')
      }
    } catch (error) {
      console.error('Error creating custom field:', error)
      toast.error('Failed to create custom field')
    }
  }

  // Update custom field
  const updateCustomField = async () => {
    if (!editingField || !fieldName.trim() || !fieldLabel.trim()) return

    const fieldConfig: any = {}
    if (fieldType === 'select' || fieldType === 'multiselect') {
      const options = selectOptions.filter(opt => opt.trim())
      if (options.length === 0) {
        toast.error('At least one option is required for select fields')
        return
      }
      fieldConfig.options = options
    }

    try {
      const response = await fetch(`/api/send/custom-fields/${editingField.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: fieldName,
          label: fieldLabel,
          field_type: fieldType,
          description: fieldDescription,
          placeholder: fieldPlaceholder,
          is_required: isRequired,
          field_config: fieldConfig,
          group_name: groupName
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Custom field updated successfully')
        setEditingField(null)
        resetForm()
        fetchCustomFields()
      } else {
        toast.error(data.error || 'Failed to update custom field')
      }
    } catch (error) {
      console.error('Error updating custom field:', error)
      toast.error('Failed to update custom field')
    }
  }

  // Delete custom field
  const deleteCustomField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field?')) {
      return
    }

    try {
      const response = await fetch(`/api/send/custom-fields/${fieldId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Custom field deleted successfully')
        fetchCustomFields()
      } else {
        toast.error(data.error || 'Failed to delete custom field')
      }
    } catch (error) {
      console.error('Error deleting custom field:', error)
      toast.error('Failed to delete custom field')
    }
  }

  // Toggle field active status
  const toggleFieldStatus = async (fieldId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/send/custom-fields/${fieldId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: !isActive })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Field ${!isActive ? 'activated' : 'deactivated'} successfully`)
        fetchCustomFields()
      } else {
        toast.error(data.error || 'Failed to update field status')
      }
    } catch (error) {
      console.error('Error updating field status:', error)
      toast.error('Failed to update field status')
    }
  }

  // Handle drag and drop reordering - disabled for now
  // const handleDragEnd = async (result: any) => {
  //   if (!result.destination) return

  //   const items = Array.from(customFields)
  //   const [reorderedItem] = items.splice(result.source.index, 1)
  //   items.splice(result.destination.index, 0, reorderedItem)

  //   // Update display order
  //   const updates = items.map((item, index) => ({
  //     id: item.id,
  //     display_order: index
  //   }))

  //   setCustomFields(items)

  //   // Update in backend
  //   try {
  //     await Promise.all(
  //       updates.map(update =>
  //         fetch(`/api/send/custom-fields/${update.id}`, {
  //           method: 'PATCH',
  //           headers: { 'Content-Type': 'application/json' },
  //           body: JSON.stringify({ display_order: update.display_order })
  //         })
  //       )
  //     )
  //   } catch (error) {
  //     console.error('Error updating field order:', error)
  //     toast.error('Failed to update field order')
  //     fetchCustomFields() // Revert on error
  //   }
  // }

  // Reset form
  const resetForm = () => {
    setFieldName('')
    setFieldLabel('')
    setFieldType('text')
    setFieldDescription('')
    setFieldPlaceholder('')
    setIsRequired(false)
    setGroupName('')
    setSelectOptions([''])
  }

  // Handle edit field
  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setFieldName(field.name)
    setFieldLabel(field.label)
    setFieldType(field.field_type)
    setFieldDescription(field.description || '')
    setFieldPlaceholder(field.placeholder || '')
    setIsRequired(field.is_required)
    setGroupName(field.group_name || '')

    if (field.field_type === 'select' || field.field_type === 'multiselect') {
      setSelectOptions(field.field_config?.options || [''])
    } else {
      setSelectOptions([''])
    }
  }

  // Get field type icon
  const getFieldTypeIcon = (type: string) => {
    const fieldType = fieldTypes.find(ft => ft.value === type)
    return fieldType ? fieldType.icon : Type
  }

  useEffect(() => {
    fetchCustomFields()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom Fields</h3>
          <p className="text-sm text-gray-500">
            Create custom fields to collect data from document viewers
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Field</DialogTitle>
              <DialogDescription>
                Add a new custom field to collect information from viewers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="field-name">Field Name</Label>
                  <Input
                    id="field-name"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                    placeholder="e.g., company_name"
                  />
                </div>
                <div>
                  <Label htmlFor="field-label">Display Label</Label>
                  <Input
                    id="field-label"
                    value={fieldLabel}
                    onChange={(e) => setFieldLabel(e.target.value)}
                    placeholder="e.g., Company Name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="field-type">Field Type</Label>
                <Select value={fieldType} onValueChange={setFieldType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {(fieldType === 'select' || fieldType === 'multiselect') && (
                <div>
                  <Label>Options</Label>
                  <div className="space-y-2">
                    {selectOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...selectOptions]
                            newOptions[index] = e.target.value
                            setSelectOptions(newOptions)
                          }}
                          placeholder={`Option ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOptions = selectOptions.filter((_, i) => i !== index)
                            setSelectOptions(newOptions.length > 0 ? newOptions : [''])
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
                      onClick={() => setSelectOptions([...selectOptions, ''])}
                    >
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="field-description">Description (Optional)</Label>
                <Textarea
                  id="field-description"
                  value={fieldDescription}
                  onChange={(e) => setFieldDescription(e.target.value)}
                  placeholder="Help text for viewers"
                />
              </div>

              <div>
                <Label htmlFor="field-placeholder">Placeholder (Optional)</Label>
                <Input
                  id="field-placeholder"
                  value={fieldPlaceholder}
                  onChange={(e) => setFieldPlaceholder(e.target.value)}
                  placeholder="Placeholder text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="group-name">Group Name (Optional)</Label>
                  <Input
                    id="group-name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g., Contact Information"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <CustomSwitch
                    checked={isRequired}
                    onCheckedChange={setIsRequired}
                  />
                  <Label htmlFor="is-required">Required field</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createCustomField}>
                  Create Field
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fields List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : customFields.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500">No custom fields found</p>
            <p className="text-sm text-gray-400">Create your first field to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {customFields.map((field, index) => {
            const Icon = getFieldTypeIcon(field.field_type)
            return (
              <Card
                key={field.id}
                className={`${!field.is_active ? 'opacity-50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-gray-600" />

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{field.label}</h4>
                        {field.is_required && (
                          <Badge variant="secondary" className="text-xs">
                            Required
                          </Badge>
                        )}
                        {!field.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                        {field.group_name && (
                          <Badge variant="outline" className="text-xs">
                            {field.group_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Type: {fieldTypes.find(ft => ft.value === field.field_type)?.label}</span>
                        <span>Name: {field.name}</span>
                        {field.description && (
                          <span>Description: {field.description}</span>
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
                        <DropdownMenuItem
                          onClick={() => handleEditField(field)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleFieldStatus(field.id, field.is_active)}
                        >
                          {field.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteCustomField(field.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Field Dialog */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Custom Field</DialogTitle>
            <DialogDescription>
              Update field settings and configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-field-name">Field Name</Label>
                <Input
                  id="edit-field-name"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g., company_name"
                />
              </div>
              <div>
                <Label htmlFor="edit-field-label">Display Label</Label>
                <Input
                  id="edit-field-label"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="e.g., Company Name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-field-type">Field Type</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {(fieldType === 'select' || fieldType === 'multiselect') && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {selectOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...selectOptions]
                          newOptions[index] = e.target.value
                          setSelectOptions(newOptions)
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newOptions = selectOptions.filter((_, i) => i !== index)
                          setSelectOptions(newOptions.length > 0 ? newOptions : [''])
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
                    onClick={() => setSelectOptions([...selectOptions, ''])}
                  >
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="edit-field-description">Description (Optional)</Label>
              <Textarea
                id="edit-field-description"
                value={fieldDescription}
                onChange={(e) => setFieldDescription(e.target.value)}
                placeholder="Help text for viewers"
              />
            </div>

            <div>
              <Label htmlFor="edit-field-placeholder">Placeholder (Optional)</Label>
              <Input
                id="edit-field-placeholder"
                value={fieldPlaceholder}
                onChange={(e) => setFieldPlaceholder(e.target.value)}
                placeholder="Placeholder text"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-group-name">Group Name (Optional)</Label>
                <Input
                  id="edit-group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., Contact Information"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <CustomSwitch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
                <Label htmlFor="edit-is-required">Required field</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingField(null)}
              >
                Cancel
              </Button>
              <Button onClick={updateCustomField}>
                Update Field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  )
}
