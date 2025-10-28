export interface SvgLabelRequest {
  svg: string;
  imageBase64: string;
}

export interface SvgLabelResponse {
  svg: string;
  labels: Array<{
    id: string;
    label: string;
    reason?: string;
  }>;
}
