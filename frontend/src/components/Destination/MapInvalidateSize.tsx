import { useEffect } from "react";
import { useMap } from "react-leaflet";

function ResizeMap() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}
export default ResizeMap;
