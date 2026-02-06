import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Upload, 
  MessageSquare, 
  FileText, 
  Image,
  Car,
  Palette,
  RefreshCw,
  Check,
  AlertTriangle
} from "lucide-react";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const IMPORT_TYPES = [
  { id: 'brands', label: 'Car Brands', icon: Car, format: 'BrandName,Country[,luxury]', example: 'Maruti Suzuki,India\nHyundai,South Korea\nBMW,Germany,luxury' },
  { id: 'colors', label: 'Car Colors', icon: Palette, format: 'car_slug,ColorName,HexCode[,ImageURL]', example: 'maruti-swift,Pearl White,#FFFFFF\nmaruti-swift,Midnight Blue,#1A237E' },
  { id: 'images', label: 'Car Images', icon: Image, format: 'car_slug,ImageURL[,alt_text][,is_primary]', example: 'maruti-swift,https://example.com/swift-front.jpg,Front View,true\nmaruti-swift,https://example.com/swift-side.jpg,Side View' },
  { id: 'specifications', label: 'Car Specs', icon: FileText, format: 'car_slug,Category,Label,Value', example: 'maruti-swift,Engine,Displacement,1197 cc\nmaruti-swift,Engine,Max Power,90 PS\nmaruti-swift,Performance,Top Speed,180 kmph' },
  { id: 'features', label: 'Car Features', icon: Check, format: 'car_slug,Category,FeatureName[,is_standard]', example: 'maruti-swift,Safety,ABS with EBD,true\nmaruti-swift,Comfort,Automatic Climate Control,true' },
];

export const QuickTextImporter = () => {
  const [importType, setImportType] = useState('brands');
  const [textInput, setTextInput] = useState('');
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();

  const selectedType = IMPORT_TYPES.find(t => t.id === importType);

  const parseInput = () => {
    const lines = textInput.trim().split('\n').filter(line => line.trim());
    const parsed = lines.map(line => line.split(',').map(cell => cell.trim()));
    setPreviewData(parsed);
    return parsed;
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const data = parseInput();
      if (data.length === 0) throw new Error('No data to import');

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      switch (importType) {
        case 'brands': {
          const brandsToAdd = data.map((row, idx) => ({
            name: row[0],
            slug: row[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            country: row[1] || 'Unknown',
            is_luxury: row[2]?.toLowerCase() === 'luxury' || row[2]?.toLowerCase() === 'true',
            sort_order: idx + 1
          })).filter(b => b.name);

          const { data: result, error } = await supabase
            .from('car_brands')
            .upsert(brandsToAdd, { onConflict: 'name' })
            .select();

          if (error) throw error;
          success = result?.length || 0;
          break;
        }

        case 'colors': {
          // First get car IDs by slug
          const slugs = [...new Set(data.map(row => row[0]))];
          const { data: cars } = await supabase
            .from('cars')
            .select('id, slug')
            .in('slug', slugs);

          const carMap = new Map(cars?.map(c => [c.slug, c.id]) || []);

          for (const row of data) {
            const carId = carMap.get(row[0]);
            if (!carId) {
              failed++;
              errors.push(`Car not found: ${row[0]}`);
              continue;
            }

            const { error } = await supabase
              .from('car_colors')
              .insert({
                car_id: carId,
                name: row[1],
                hex_code: row[2] || '#000000',
                image_url: row[3] || null
              });

            if (error) {
              failed++;
              errors.push(`${row[1]}: ${error.message}`);
            } else {
              success++;
            }
          }
          break;
        }

        case 'images': {
          const slugs = [...new Set(data.map(row => row[0]))];
          const { data: cars } = await supabase
            .from('cars')
            .select('id, slug')
            .in('slug', slugs);

          const carMap = new Map(cars?.map(c => [c.slug, c.id]) || []);

          for (const row of data) {
            const carId = carMap.get(row[0]);
            if (!carId) {
              failed++;
              errors.push(`Car not found: ${row[0]}`);
              continue;
            }

            const { error } = await supabase
              .from('car_images')
              .insert({
                car_id: carId,
                url: row[1],
                alt_text: row[2] || null,
                is_primary: row[3]?.toLowerCase() === 'true'
              });

            if (error) {
              failed++;
              errors.push(`Image: ${error.message}`);
            } else {
              success++;
            }
          }
          break;
        }

        case 'specifications': {
          const slugs = [...new Set(data.map(row => row[0]))];
          const { data: cars } = await supabase
            .from('cars')
            .select('id, slug')
            .in('slug', slugs);

          const carMap = new Map(cars?.map(c => [c.slug, c.id]) || []);

          for (const row of data) {
            const carId = carMap.get(row[0]);
            if (!carId) {
              failed++;
              errors.push(`Car not found: ${row[0]}`);
              continue;
            }

            const { error } = await supabase
              .from('car_specifications')
              .insert({
                car_id: carId,
                category: row[1],
                label: row[2],
                value: row[3]
              });

            if (error) {
              failed++;
              errors.push(`Spec ${row[2]}: ${error.message}`);
            } else {
              success++;
            }
          }
          break;
        }

        case 'features': {
          const slugs = [...new Set(data.map(row => row[0]))];
          const { data: cars } = await supabase
            .from('cars')
            .select('id, slug')
            .in('slug', slugs);

          const carMap = new Map(cars?.map(c => [c.slug, c.id]) || []);

          for (const row of data) {
            const carId = carMap.get(row[0]);
            if (!carId) {
              failed++;
              errors.push(`Car not found: ${row[0]}`);
              continue;
            }

            const { error } = await supabase
              .from('car_features')
              .insert({
                car_id: carId,
                category: row[1],
                feature_name: row[2],
                is_standard: row[3]?.toLowerCase() !== 'false'
              });

            if (error) {
              failed++;
              errors.push(`Feature ${row[2]}: ${error.message}`);
            } else {
              success++;
            }
          }
          break;
        }
      }

      return { success, failed, errors };
    },
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      if (result.failed === 0) {
        toast.success(`Successfully imported ${result.success} items`);
      } else {
        toast.warning(`Imported ${result.success} items, ${result.failed} failed`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Quick Text Importer
          </h2>
          <p className="text-muted-foreground">
            Import data by simply pasting text - no CSV files needed
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
            <CardDescription>Select type and paste your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select import type" />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedType && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Format:</p>
                <code className="text-xs">{selectedType.format}</code>
                <p className="font-medium mt-2 mb-1">Example:</p>
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                  {selectedType.example}
                </pre>
              </div>
            )}

            <Textarea
              placeholder={`Paste your ${selectedType?.label.toLowerCase() || 'data'} here...`}
              className="min-h-[200px] font-mono text-sm"
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setPreviewData([]);
                setLastResult(null);
              }}
            />

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {textInput.trim().split('\n').filter(l => l.trim()).length} lines
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => parseInput()}>
                  Preview
                </Button>
                <Button 
                  onClick={() => importMutation.mutate()}
                  disabled={!textInput.trim() || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview/Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              {lastResult ? 'Import Results' : 'Preview'}
            </CardTitle>
            <CardDescription>
              {lastResult 
                ? `${lastResult.success} succeeded, ${lastResult.failed} failed`
                : 'Preview your data before importing'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastResult ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-bold text-green-600">{lastResult.success}</span>
                    <span className="text-sm text-muted-foreground">imported</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="text-lg font-bold text-red-600">{lastResult.failed}</span>
                    <span className="text-sm text-muted-foreground">failed</span>
                  </div>
                </div>

                {lastResult.errors.length > 0 && (
                  <div className="bg-destructive/10 p-3 rounded-lg max-h-[200px] overflow-y-auto">
                    <p className="font-medium text-destructive mb-2">Errors:</p>
                    <ul className="text-sm text-destructive space-y-1">
                      {lastResult.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {lastResult.errors.length > 10 && (
                        <li>... and {lastResult.errors.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ) : previewData.length > 0 ? (
              <div className="overflow-x-auto max-h-[300px]">
                <Table>
                  <TableBody>
                    {previewData.slice(0, 10).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="py-2 text-sm">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {previewData.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          ... and {previewData.length - 10} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Paste data and click Preview to see it here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Format Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Format Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {IMPORT_TYPES.map((type) => (
              <div key={type.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <type.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{type.label}</span>
                </div>
                <code className="text-xs text-muted-foreground block mb-2">{type.format}</code>
                <pre className="text-xs bg-muted p-2 rounded font-mono whitespace-pre-wrap">
                  {type.example.split('\n')[0]}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickTextImporter;
