'use client';

import * as React from 'react';
import { Accordion as AccordionPrimitive } from 'radix-ui';
import { FileIcon, FolderIcon, FolderOpenIcon, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface TreeViewElement {
  id: string;
  name: string;
  type?: 'file' | 'folder';
  isSelectable?: boolean;
  children?: TreeViewElement[];
}

export type TreeSortMode =
  | 'default'
  | 'none'
  | ((a: TreeViewElement, b: TreeViewElement) => number);

interface TreeContextProps {
  selectedId: string | undefined;
  expandedItems: string[] | undefined;
  indicator: boolean;
  handleExpand: (id: string) => void;
  selectItem: (id: string) => void;
  setExpandedItems?: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  direction: 'rtl' | 'ltr';
}

const TreeContext = React.createContext<TreeContextProps | null>(null);

const useTree = () => {
  const context = React.useContext(TreeContext);
  if (!context) {
    throw new Error('useTree must be used within a TreeProvider');
  }
  return context;
};

const isFolderElement = (element: TreeViewElement) => {
  if (element.type) {
    return element.type === 'folder';
  }
  return Array.isArray(element.children);
};

const mergeExpandedItems = (currentItems: string[] | undefined, nextItems: string[]) => [
  ...new Set([...(currentItems ?? []), ...nextItems]),
];

const treeCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base',
});

const defaultTreeComparator = (a: TreeViewElement, b: TreeViewElement) => {
  const aIsFolder = isFolderElement(a);
  const bIsFolder = isFolderElement(b);

  if (aIsFolder !== bIsFolder) {
    return aIsFolder ? -1 : 1;
  }

  return treeCollator.compare(a.name, b.name);
};

const getTreeComparator = (sort: TreeSortMode) => {
  if (sort === 'none') return undefined;
  if (sort === 'default') return defaultTreeComparator;
  return sort;
};

const sortTreeElements = (elements: TreeViewElement[], sort: TreeSortMode): TreeViewElement[] => {
  const comparator = getTreeComparator(sort);

  const nextElements = elements.map((element) => {
    if (!Array.isArray(element.children)) return element;
    return { ...element, children: sortTreeElements(element.children, sort) };
  });

  if (!comparator) return nextElements;
  return [...nextElements].sort(comparator);
};

const renderTreeElements = (elements: TreeViewElement[], sort: TreeSortMode): React.ReactNode =>
  sortTreeElements(elements, sort).map((element) => {
    if (isFolderElement(element)) {
      return (
        <Folder
          key={element.id}
          value={element.id}
          element={element.name}
          isSelectable={element.isSelectable}
        >
          {Array.isArray(element.children) ? renderTreeElements(element.children, sort) : null}
        </Folder>
      );
    }

    return (
      <File key={element.id} value={element.id} isSelectable={element.isSelectable}>
        <span>{element.name}</span>
      </File>
    );
  });

interface TreeViewProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect' | 'defaultValue'> {
  initialSelectedId?: string;
  indicator?: boolean;
  elements?: TreeViewElement[];
  initialExpandedItems?: string[];
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  dir?: 'rtl' | 'ltr';
  onSelect?: (id: string) => void;
  sort?: TreeSortMode;
}

const Tree = React.forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      elements,
      initialSelectedId,
      initialExpandedItems,
      children,
      indicator = true,
      openIcon,
      closeIcon,
      dir,
      onSelect,
      sort = 'default',
      ...props
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = React.useState<string | undefined>(initialSelectedId);
    const [expandedItems, setExpandedItems] = React.useState<string[] | undefined>(
      initialExpandedItems
    );

    const selectItem = React.useCallback(
      (id: string) => {
        setSelectedId(id);
        onSelect?.(id);
      },
      [onSelect]
    );

    const handleExpand = React.useCallback((id: string) => {
      setExpandedItems((prev) => {
        if (prev?.includes(id)) {
          return prev.filter((item) => item !== id);
        }
        return [...(prev ?? []), id];
      });
    }, []);

    const expandSpecificTargetedElements = React.useCallback(
      (elems?: TreeViewElement[], selectId?: string) => {
        if (!elems || !selectId) return;
        const findParent = (currentElement: TreeViewElement, currentPath: string[] = []) => {
          const isSelectable = currentElement.isSelectable ?? true;
          const newPath = [...currentPath, currentElement.id];
          if (currentElement.id === selectId) {
            if (isSelectable) {
              setExpandedItems((prev) => mergeExpandedItems(prev, newPath));
            } else {
              if (newPath.includes(currentElement.id)) {
                newPath.pop();
                setExpandedItems((prev) => mergeExpandedItems(prev, newPath));
              }
            }
            return;
          }
          if (Array.isArray(currentElement.children) && currentElement.children.length > 0) {
            currentElement.children.forEach((child) => {
              findParent(child, newPath);
            });
          }
        };
        elems.forEach((element) => {
          findParent(element);
        });
      },
      []
    );

    React.useEffect(() => {
      if (initialSelectedId) {
        expandSpecificTargetedElements(elements, initialSelectedId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSelectedId, elements]);

    const direction = dir === 'rtl' ? 'rtl' : 'ltr';
    const treeChildren = children ?? (elements ? renderTreeElements(elements, sort) : null);

    return (
      <TreeContext.Provider
        value={{
          selectedId,
          expandedItems,
          handleExpand,
          selectItem,
          setExpandedItems,
          indicator,
          openIcon,
          closeIcon,
          direction,
        }}
      >
        <div className={cn('size-full', className)}>
          <ScrollArea ref={ref} className="relative h-full px-2" dir={dir as 'ltr' | 'rtl'}>
            <AccordionPrimitive.Root
              {...props}
              type="multiple"
              value={expandedItems}
              className="flex flex-col gap-1"
              dir={dir}
            >
              {treeChildren}
            </AccordionPrimitive.Root>
          </ScrollArea>
        </div>
      </TreeContext.Provider>
    );
  }
);

Tree.displayName = 'Tree';

const TreeIndicator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { direction } = useTree();

    return (
      <div
        dir={direction}
        ref={ref}
        className={cn(
          'bg-muted absolute left-1.5 h-full w-px rounded-md py-3 duration-300 ease-in-out hover:bg-slate-300 rtl:right-1.5',
          className
        )}
        {...props}
      />
    );
  }
);

TreeIndicator.displayName = 'TreeIndicator';

interface FolderComponentProps {
  element: string;
  value: string;
  isSelectable?: boolean;
  isSelect?: boolean;
}

const Folder = React.forwardRef<
  HTMLDivElement,
  FolderComponentProps & React.HTMLAttributes<HTMLDivElement>
>(({ className, element, value, isSelectable = true, isSelect, children, ...props }, ref) => {
  const {
    direction,
    handleExpand,
    expandedItems,
    indicator,
    selectedId,
    selectItem,
    openIcon,
    closeIcon,
  } = useTree();
  const isSelected = isSelect ?? selectedId === value;

  return (
    <AccordionPrimitive.Item
      {...props}
      ref={ref}
      value={value}
      className="relative h-full overflow-hidden"
    >
      <AccordionPrimitive.Trigger
        className={cn('flex items-center gap-1 rounded-md text-sm', className, {
          'bg-muted rounded-md': isSelected && isSelectable,
          'cursor-pointer': isSelectable,
          'cursor-not-allowed opacity-50': !isSelectable,
        })}
        disabled={!isSelectable}
        onClick={() => {
          selectItem(value);
          handleExpand(value);
        }}
      >
        {expandedItems?.includes(value)
          ? (openIcon ?? <FolderOpenIcon className="size-4" />)
          : (closeIcon ?? <FolderIcon className="size-4" />)}
        <span>{element}</span>
      </AccordionPrimitive.Trigger>
      <AccordionPrimitive.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down relative h-full overflow-hidden text-sm">
        {element && indicator ? <TreeIndicator aria-hidden="true" /> : null}
        <AccordionPrimitive.Root
          dir={direction}
          type="multiple"
          className="ml-5 flex flex-col gap-1 py-1 rtl:mr-5"
          value={expandedItems}
        >
          {children}
        </AccordionPrimitive.Root>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
});

Folder.displayName = 'Folder';

const File = React.forwardRef<
  HTMLButtonElement,
  {
    value: string;
    handleSelect?: (id: string) => void;
    isSelectable?: boolean;
    isSelect?: boolean;
    fileIcon?: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(
  (
    {
      value,
      className,
      handleSelect,
      onClick,
      isSelectable = true,
      isSelect,
      fileIcon,
      children,
      ...props
    },
    ref
  ) => {
    const { direction, selectedId, selectItem } = useTree();
    const isSelected = isSelect ?? selectedId === value;
    return (
      <button
        ref={ref}
        type="button"
        disabled={!isSelectable}
        className={cn(
          'flex w-fit items-center gap-1 rounded-md pr-1 text-sm duration-200 ease-in-out rtl:pr-0 rtl:pl-1',
          {
            'bg-muted': isSelected && isSelectable,
          },
          isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          direction === 'rtl' ? 'rtl' : 'ltr',
          className
        )}
        onClick={(event) => {
          selectItem(value);
          handleSelect?.(value);
          onClick?.(event);
        }}
        {...props}
      >
        {fileIcon ?? <FileIcon className="size-4" />}
        {children}
      </button>
    );
  }
);

File.displayName = 'File';

const CollapseButton = React.forwardRef<
  HTMLButtonElement,
  {
    elements: TreeViewElement[];
    expandAll?: boolean;
  } & React.HTMLAttributes<HTMLButtonElement>
>(({ className, elements, expandAll = false, children, ...props }, ref) => {
  const { expandedItems, setExpandedItems } = useTree();

  const expandAllTree = React.useCallback((elems: TreeViewElement[]) => {
    const ids: string[] = [];
    const walk = (el: TreeViewElement) => {
      if ((el.isSelectable ?? true) && el.children && el.children.length > 0) {
        ids.push(el.id);
        for (const child of el.children) walk(child);
      }
    };
    for (const el of elems) walk(el);
    return [...new Set(ids)];
  }, []);

  const closeAll = React.useCallback(() => {
    setExpandedItems?.([]);
  }, [setExpandedItems]);

  React.useEffect(() => {
    if (expandAll) {
      setExpandedItems?.(expandAllTree(elements));
    }
  }, [expandAll, elements, expandAllTree, setExpandedItems]);

  const isExpanded = expandedItems && expandedItems.length > 0;

  return (
    <button
      type="button"
      className={cn(
        'text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md p-1 text-xs transition-colors',
        className
      )}
      onClick={isExpanded ? closeAll : () => setExpandedItems?.(expandAllTree(elements))}
      ref={ref}
      {...props}
    >
      {children ??
        (isExpanded ? (
          <ChevronsDownUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5" />
        ))}
      <span className="sr-only">Toggle</span>
    </button>
  );
});

CollapseButton.displayName = 'CollapseButton';

export { CollapseButton, File, Folder, Tree, useTree };
